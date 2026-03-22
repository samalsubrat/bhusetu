"""
=============================================================================
  GAS FEE PREDICTION MODEL — LightGBM Blockchain Analytics Engine
=============================================================================
Author: ML Engineering Team
Description:
    Predicts Ethereum gas fees using LightGBM (Light Gradient Boosting Machine)
    on historical blockchain data. Same data pipeline, same features, and the
    same evaluation as the XGBoost, Random Forest, and CatBoost models — making
    direct 4-way comparison seamless.

Why LightGBM for Gas Fees?
  - FASTEST training among the four models (leaf-wise tree growth vs level-wise)
  - Histogram-based algorithm — bins continuous features for massive speedup
  - GOSS (Gradient-based One-Side Sampling): keeps high-gradient samples,
    randomly drops low-gradient ones → efficient on large datasets
  - EFB (Exclusive Feature Bundling): merges sparse features → fewer features
    to split on → faster training
  - Supports GPU training and distributed training natively
  - Handles large datasets (millions of rows) far faster than XGBoost/CatBoost
  - Great default performance with fewer hyperparameters to tune than XGBoost

LightGBM vs XGBoost vs CatBoost vs Random Forest:
  ┌──────────────────────────┬──────────┬──────────┬──────────┬──────────┐
  │ Criterion                │ LightGBM │ XGBoost  │ CatBoost │ Rand.For.│
  ├──────────────────────────┼──────────┼──────────┼──────────┼──────────┤
  │ Training speed           │ Fastest  │ Medium   │ Medium   │ Slow     │
  │ Leaf-wise growth         │ Yes      │ No       │ No       │ No       │
  │ Memory efficiency        │ High     │ Medium   │ Medium   │ Low      │
  │ Large dataset perf.      │ Excellent│ Good     │ Good     │ Poor     │
  │ Categorical handling     │ Native*  │ Manual   │ Native   │ Manual   │
  │ Overfitting risk         │ Higher** │ Medium   │ Low      │ Low      │
  └──────────────────────────┴──────────┴──────────┴──────────┴──────────┘
  * LightGBM can handle categoricals natively; we use cyclical encoding here
    for parity with the other models.
  ** Leaf-wise growth can overfit on small datasets; use min_child_samples
     and num_leaves to regularise.

Key Regularisation Parameters (leaf-wise specific):
  num_leaves:        Max leaves per tree. Rule of thumb: 2^depth * 0.7 or less.
                     Too high = overfitting, especially on small datasets.
  min_child_samples: Min data points in a leaf. Prevents very specific leaves.
  max_depth:         -1 = unlimited (LightGBM controls via num_leaves instead)
  reg_alpha (L1):    Sparsity inducing regularisation on leaf weights
  reg_lambda (L2):   Shrinks all leaf weights towards zero

Run:
    python lightgbm_model.py                           # simulate + train
    python lightgbm_model.py --csv blockchain_data.csv # real CSV data
    python lightgbm_model.py --web3 --rpc <URL>        # live Web3 data
    python lightgbm_model.py --tune                    # hyperparameter search
    python lightgbm_model.py --compare                 # compare all 4 models
=============================================================================
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.patches as mpatches
import warnings
import joblib
import os
import time

from datetime import datetime, timedelta
import lightgbm as lgb
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

warnings.filterwarnings("ignore")


# ═══════════════════════════════════════════════════════════════
#  SECTION 1 — DATA SIMULATION
# ═══════════════════════════════════════════════════════════════

def simulate_blockchain_data(n_blocks: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Simulates realistic Ethereum-like blockchain data with EIP-1559 mechanics."""
    np.random.seed(seed)
    start_time    = datetime(2024, 3, 1)
    timestamps    = [start_time + timedelta(seconds=12 * i) for i in range(n_blocks)]
    block_numbers = np.arange(19_000_000, 19_000_000 + n_blocks)
    gas_limit     = np.random.normal(30_000_000, 500_000, n_blocks).clip(15_000_000, 36_000_000)
    hour_of_day   = np.array([t.hour for t in timestamps])
    tx_base       = 150 + 80 * np.sin((hour_of_day - 9) * np.pi / 12)
    transaction_count = np.random.normal(tx_base, 30, n_blocks).clip(10, 300).astype(int)
    gas_used_ratio = (transaction_count / 300) * np.random.normal(0.85, 0.1, n_blocks)
    gas_used_ratio = gas_used_ratio.clip(0.1, 1.0)
    gas_used       = (gas_used_ratio * gas_limit).astype(int)
    base_fee       = np.zeros(n_blocks)
    base_fee[0]    = 30e9
    for i in range(1, n_blocks):
        utilization = gas_used[i - 1] / gas_limit[i - 1]
        delta       = (utilization - 0.5) / 0.5
        base_fee[i] = base_fee[i - 1] * (1 + 0.125 * delta)
        base_fee[i] = np.clip(base_fee[i], 1e9, 500e9)
    mempool_pressure = gas_used / gas_limit
    priority_fee     = (np.random.lognormal(1.5, 0.8, n_blocks) * 1e9 * mempool_pressure).clip(1e9, 50e9)
    mempool_size     = (transaction_count * np.random.uniform(2, 8, n_blocks)).astype(int)
    gas_price_gwei   = (base_fee + priority_fee) / 1e9
    df = pd.DataFrame({
        "block_number": block_numbers, "timestamp": timestamps,
        "gas_used": gas_used, "gas_limit": gas_limit, "base_fee": base_fee,
        "transaction_count": transaction_count, "mempool_size": mempool_size,
        "priority_fee": priority_fee, "gas_price_gwei": gas_price_gwei,
    })
    for col in ["mempool_size", "priority_fee"]:
        mask = np.random.rand(n_blocks) < 0.03
        df.loc[mask, col] = np.nan
    return df


def load_or_simulate_data(csv_path=None, n_blocks=5000, use_web3=False, rpc_url=None):
    if csv_path and os.path.exists(csv_path):
        print(f"[DATA] Loading CSV: {csv_path}")
        df = pd.read_csv(csv_path, parse_dates=["timestamp"])
        print(f"[DATA] Loaded {len(df):,} rows")
        return df
    if use_web3:
        try:
            from data_collector import get_real_data
            df = get_real_data(rpc_url=rpc_url, n_blocks=n_blocks,
                               output_csv=csv_path or "blockchain_data.csv")
            return df
        except Exception as e:
            print(f"[WARN] Web3 failed ({e}) — falling back to simulation")
    print("[DATA] Simulating blockchain data...")
    df = simulate_blockchain_data(n_blocks)
    print(f"[DATA] Simulated {len(df):,} blocks")
    return df


# ═══════════════════════════════════════════════════════════════
#  SECTION 2 — FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw blockchain data into 35 ML-ready features.
    Identical feature set to rfmodel.py, model.py, and catboost_model.py for
    direct apples-to-apples comparison across all four models.
    """
    df = df.copy().sort_values("block_number").reset_index(drop=True)
    df["hour"]        = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_weekend"]  = (df["day_of_week"] >= 5).astype(int)
    df["month"]       = df["timestamp"].dt.month
    df["hour_sin"]    = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]    = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]     = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]     = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["block_utilization"] = df["gas_used"] / df["gas_limit"]
    df["tx_density"]        = df["transaction_count"] / df["gas_limit"] * 1e6
    for window in [5, 15, 50]:
        df[f"base_fee_roll_{window}"]    = df["base_fee"].shift(1).rolling(window, min_periods=1).mean()
        df[f"utilization_roll_{window}"] = df["block_utilization"].shift(1).rolling(window, min_periods=1).mean()
        df[f"tx_count_roll_{window}"]    = df["transaction_count"].shift(1).rolling(window, min_periods=1).mean()
    for lag in [1, 2, 3, 5, 10]:
        df[f"gas_price_lag_{lag}"] = df["gas_price_gwei"].shift(lag)
        df[f"base_fee_lag_{lag}"]  = df["base_fee"].shift(lag)
    df["base_fee_pct_change"]   = df["base_fee"].pct_change(1).replace([np.inf, -np.inf], 0)
    df["base_fee_acceleration"] = df["base_fee_pct_change"].diff(1)
    df["mempool_size"]  = df["mempool_size"].fillna(df["mempool_size"].rolling(10, min_periods=1).median()).fillna(500)
    df["priority_fee"]  = df["priority_fee"].fillna(df["priority_fee"].rolling(10, min_periods=1).median()).fillna(2e9)
    df["mempool_pressure"]  = df["mempool_size"] / (df["transaction_count"] + 1)
    df["priority_fee_gwei"] = df["priority_fee"] / 1e9
    df["base_fee_gwei"]     = df["base_fee"] / 1e9
    return df


def select_features(df: pd.DataFrame) -> tuple:
    drop_cols    = ["block_number", "timestamp", "gas_price_gwei",
                    "base_fee", "priority_fee", "hour", "day_of_week", "month"]
    feature_cols = [c for c in df.columns if c not in drop_cols]
    return df[feature_cols].copy(), df["gas_price_gwei"].copy(), feature_cols


def preprocess(df: pd.DataFrame, test_size: float = 0.2) -> dict:
    """Full preprocessing pipeline with chronological train/test split."""
    print("[PREPROCESS] Engineering features...")
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce").fillna(pd.Timestamp("2024-01-01"))
    df_feat = engineer_features(df)
    lag_roll_cols = [c for c in df_feat.columns
                     if any(t in c for t in ["_lag_", "_roll_", "_pct_change", "_acceleration"])]
    df_feat[lag_roll_cols] = df_feat[lag_roll_cols].ffill().bfill().fillna(0)
    df_feat = df_feat.dropna(subset=["gas_price_gwei"]).reset_index(drop=True)
    if len(df_feat) == 0:
        raise ValueError("Dataset empty after preprocessing.")
    X, y, feature_names = select_features(df_feat)
    X = X.fillna(X.median(numeric_only=True)).fillna(0)
    split_idx       = int(len(X) * (1 - test_size))
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    print(f"[PREPROCESS] Train: {len(X_train):,} | Test: {len(X_test):,} | Features: {len(feature_names)}")
    return {"X_train": X_train, "X_test": X_test,
            "y_train": y_train, "y_test": y_test,
            "feature_names": feature_names, "df_feat": df_feat}


# ═══════════════════════════════════════════════════════════════
#  SECTION 3 — LIGHTGBM MODEL
# ═══════════════════════════════════════════════════════════════

def tune_lightgbm(X_train, y_train, n_iter=30, cv_folds=5) -> dict:
    """
    RandomizedSearchCV with TimeSeriesSplit for LightGBM hyperparameter tuning.

    Key LightGBM-specific parameters:
      num_leaves:        Core complexity control for leaf-wise trees. Rule:
                         num_leaves < 2^max_depth. Higher → more complex, more overfit.
      max_depth:         Limits tree depth (use with num_leaves for regularisation)
      learning_rate:     Shrinkage; lower = better generalisation, needs more iterations
      n_estimators:      Boosting rounds (max; early stopping handles actual count)
      subsample:         Fraction of rows per tree (GOSS-style row subsampling)
      colsample_bytree:  Fraction of features per tree (EFB-aware feature selection)
      min_child_samples: Minimum samples in a leaf — key overfit guard for leaf-wise
      reg_alpha:         L1 regularisation (promotes sparsity in leaf weights)
      reg_lambda:        L2 regularisation (shrinks all leaf weights)
      min_split_gain:    Minimum loss reduction to make a further split
    """
    print(f"\n[TUNE] LightGBM RandomizedSearchCV — {n_iter} iterations, {cv_folds}-fold TSC...")
    param_dist = {
        "num_leaves":        [31, 63, 127, 255],
        "max_depth":         [-1, 5, 7, 9, 12],
        "learning_rate":     [0.01, 0.03, 0.05, 0.1, 0.15, 0.2],
        "n_estimators":      [200, 400, 600, 800],
        "subsample":         [0.6, 0.7, 0.8, 0.9, 1.0],
        "colsample_bytree":  [0.6, 0.7, 0.8, 0.9, 1.0],
        "min_child_samples": [5, 10, 20, 50, 100],
        "reg_alpha":         [0.0, 0.01, 0.1, 1.0],
        "reg_lambda":        [0.0, 0.1, 1.0, 5.0],
        "min_split_gain":    [0.0, 0.01, 0.1, 0.5],
    }
    tscv       = TimeSeriesSplit(n_splits=cv_folds)
    base_model = lgb.LGBMRegressor(objective="regression", metric="rmse",
                                   random_state=42, n_jobs=-1, verbose=-1)
    search = RandomizedSearchCV(base_model, param_dist, n_iter=n_iter,
                                scoring="neg_root_mean_squared_error", cv=tscv,
                                verbose=1, random_state=42, n_jobs=1)
    search.fit(X_train, y_train)
    print(f"[TUNE] Best CV RMSE : {-search.best_score_:.4f} Gwei")
    print(f"[TUNE] Best params  : {search.best_params_}")
    return search.best_params_


def train_lightgbm(X_train, y_train, params=None, tune=False) -> lgb.LGBMRegressor:
    """
    Trains LightGBM with optional hyperparameter tuning.

    LightGBM Overfitting Prevention:
      ┌──────────────────────────┬───────────────────────────────────────────────────┐
      │ Technique                │ How it helps                                      │
      ├──────────────────────────┼───────────────────────────────────────────────────┤
      │ num_leaves (small)       │ Limits tree complexity — primary control in LGBM  │
      │ min_child_samples        │ Prevents overly specific leaf splits              │
      │ reg_alpha / reg_lambda   │ L1/L2 regularisation on leaf weights              │
      │ subsample < 1.0          │ Stochastic boosting via row subsampling (GOSS)    │
      │ colsample_bytree < 1.0   │ Feature subsampling — reduces correlation         │
      │ min_split_gain           │ Stops split if gain doesn't exceed threshold      │
      │ Early stopping           │ Halts when eval-set loss stops improving          │
      └──────────────────────────┴───────────────────────────────────────────────────┘
    """
    if tune and params is None:
        params = tune_lightgbm(X_train, y_train)
    default_params = {
        "objective":         "regression",
        "metric":            "rmse",
        "num_leaves":        63,          # 2^6 - 1 approx; good for depth~6
        "max_depth":         -1,          # Controlled via num_leaves
        "learning_rate":     0.05,
        "n_estimators":      2000,        # Max rounds; early stopping handles actual
        "subsample":         0.8,
        "colsample_bytree":  0.8,
        "min_child_samples": 20,          # Critical for LGBM — prevent tiny leaves
        "reg_alpha":         0.1,
        "reg_lambda":        1.0,
        "min_split_gain":    0.01,
        "random_state":      42,
        "n_jobs":            -1,
        "verbose":           -1,
    }
    if params:
        default_params.update(params)
    print("\n[TRAIN] Fitting LightGBM model...")
    t0 = time.time()
    val_split = int(len(X_train) * 0.9)
    X_tr, X_val = X_train.iloc[:val_split], X_train.iloc[val_split:]
    y_tr, y_val = y_train.iloc[:val_split], y_train.iloc[val_split:]
    model = lgb.LGBMRegressor(**default_params)
    model.fit(
        X_tr, y_tr,
        eval_set=[(X_val, y_val)],
        callbacks=[
            lgb.early_stopping(stopping_rounds=50, verbose=False),
            lgb.log_evaluation(period=200),
        ],
    )
    elapsed = time.time() - t0
    print(f"[TRAIN] Training time   : {elapsed:.1f}s")
    print(f"[TRAIN] Best iteration  : {model.best_iteration_}")
    print(f"[TRAIN] Trees used      : {model.best_iteration_}")
    print(f"[TRAIN] Features used   : {model.n_features_}")
    return model


# ═══════════════════════════════════════════════════════════════
#  SECTION 4 — CROSS-VALIDATION
# ═══════════════════════════════════════════════════════════════

def cross_validate_lightgbm(model, X_train, y_train, cv_folds=5) -> dict:
    """
    TimeSeriesSplit cross-validation — always trains on past, validates on future.

    Each fold clones the model's hyperparameters and uses early stopping with
    an inner validation split, preventing data leakage inside the fold.
    """
    print(f"\n[CV] Running {cv_folds}-fold TimeSeriesSplit CV (LightGBM)...")
    tscv = TimeSeriesSplit(n_splits=cv_folds)
    p    = model.get_params()
    p.update({"verbose": -1})
    rmse_scores, mae_scores, r2_scores = [], [], []
    for fold, (tri, vli) in enumerate(tscv.split(X_train), 1):
        X_tr, y_tr = X_train.iloc[tri], y_train.iloc[tri]
        X_vl, y_vl = X_train.iloc[vli], y_train.iloc[vli]
        inner = int(len(X_tr) * 0.9)
        fm = lgb.LGBMRegressor(**p)
        fm.fit(X_tr.iloc[:inner], y_tr.iloc[:inner],
               eval_set=[(X_tr.iloc[inner:], y_tr.iloc[inner:])],
               callbacks=[lgb.early_stopping(30, verbose=False),
                          lgb.log_evaluation(-1)])
        yp   = fm.predict(X_vl)
        rmse = np.sqrt(mean_squared_error(y_vl, yp))
        mae  = mean_absolute_error(y_vl, yp)
        r2   = r2_score(y_vl, yp)
        rmse_scores.append(rmse); mae_scores.append(mae); r2_scores.append(r2)
        print(f"  Fold {fold}: RMSE={rmse:.3f}  MAE={mae:.3f}  R²={r2:.4f}")
    cv = {
        "rmse_mean": np.mean(rmse_scores), "rmse_std": np.std(rmse_scores),
        "mae_mean":  np.mean(mae_scores),  "mae_std":  np.std(mae_scores),
        "r2_mean":   np.mean(r2_scores),   "r2_std":   np.std(r2_scores),
        "rmse_per_fold": rmse_scores,
    }
    print(f"\n[CV] RMSE: {cv['rmse_mean']:.4f} ± {cv['rmse_std']:.4f}  "
          f"MAE: {cv['mae_mean']:.4f} ± {cv['mae_std']:.4f}  "
          f"R²: {cv['r2_mean']:.4f} ± {cv['r2_std']:.4f}")
    return cv


# ═══════════════════════════════════════════════════════════════
#  SECTION 5 — EVALUATION
# ═══════════════════════════════════════════════════════════════

def evaluate_model(model, X_test, y_test) -> dict:
    """Evaluates on the chronological hold-out test set (RMSE, MAE, R², MAPE)."""
    y_pred = np.clip(model.predict(X_test), 0, None)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100
    print("\n" + "═"*52)
    print("  LIGHTGBM — EVALUATION RESULTS")
    print("═"*52)
    print(f"  RMSE        : {rmse:.4f} Gwei")
    print(f"  MAE         : {mae:.4f} Gwei")
    print(f"  R²          : {r2:.4f}")
    print(f"  MAPE        : {mape:.2f}%")
    print(f"  Best iter   : {model.best_iteration_}")
    print("═"*52)
    return {"metrics": {"RMSE": rmse, "MAE": mae, "R2": r2, "MAPE": mape,
                        "Best_Iter": model.best_iteration_}, "y_pred": y_pred}


# ═══════════════════════════════════════════════════════════════
#  SECTION 6 — FEATURE IMPORTANCE
# ═══════════════════════════════════════════════════════════════

def compute_feature_importance(model, X_test, y_test, feature_names) -> pd.DataFrame:
    """
    LightGBM provides three built-in feature importance types:
      gain:  Total gain contributed by splits on this feature (split quality)
      split: Total number of times this feature is used to split (split count)

    We compute both and combine into one sorted DataFrame. 'gain' is generally
    more reliable since it accounts for the quality, not just frequency, of splits.
    """
    print("\n[IMPORTANCE] Computing LightGBM feature importances...")
    imp_gain  = model.feature_importances_  # default is 'split'; request gain explicitly
    imp_gain  = model.booster_.feature_importance(importance_type="gain")
    imp_split = model.booster_.feature_importance(importance_type="split")
    df_imp = pd.DataFrame({
        "feature":    feature_names,
        "gain":       imp_gain,
        "split_count": imp_split,
    }).sort_values("gain", ascending=False).reset_index(drop=True)
    print("\n  Top 10 Features (Gain-based):")
    for _, row in df_imp.head(10).iterrows():
        bar = "█" * int(row["gain"] / (df_imp["gain"].max() + 1e-9) * 30)
        print(f"  {row['feature']:30s} {row['gain']:.2f}  {bar}")
    return df_imp


# ═══════════════════════════════════════════════════════════════
#  SECTION 7 — VISUALIZATION
# ═══════════════════════════════════════════════════════════════

def plot_results(y_test, y_pred, importance_df, cv_results, metrics,
                 save_path="lightgbm_gas_fee_results.png"):
    """5-panel diagnostic dashboard: time series, scatter, 2× importance, CV RMSE."""
    BG, PANEL, BORDER = "#0d1117", "#161b22", "#30363d"
    TEXT, MUTED       = "#e6edf3", "#8b949e"
    LIME, CYAN        = "#a5d65b", "#56d4e8"
    PURPLE, RED, GREEN = "#bc8cff", "#f85149", "#3fb950"

    fig = plt.figure(figsize=(20, 16), facecolor=BG)
    fig.suptitle("⚡  Gas Fee Prediction — LightGBM Diagnostic Dashboard",
                 fontsize=17, color=TEXT, fontweight="bold", y=0.98)
    gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.5, wspace=0.38,
                           top=0.94, bottom=0.06, left=0.06, right=0.97)
    ax_ts   = fig.add_subplot(gs[0, :])
    ax_sc   = fig.add_subplot(gs[1, 0])
    ax_gain = fig.add_subplot(gs[1, 1])
    ax_spl  = fig.add_subplot(gs[1, 2])
    ax_cv   = fig.add_subplot(gs[2, :])

    def _style(ax, title):
        ax.set_facecolor(PANEL)
        ax.tick_params(colors=MUTED, labelsize=8.5)
        ax.xaxis.label.set_color(MUTED); ax.yaxis.label.set_color(MUTED)
        ax.set_title(title, color=TEXT, fontsize=11, pad=10, fontweight="semibold")
        for s in ax.spines.values(): s.set_edgecolor(BORDER)
        ax.grid(True, color="#21262d", linewidth=0.7, linestyle="--", alpha=0.8)

    n  = min(800, len(y_test))
    ix = np.arange(n)
    ax_ts.plot(ix, y_test.values[:n], color=CYAN, lw=0.9, alpha=0.9, label="Actual")
    ax_ts.plot(ix, y_pred[:n], color=LIME, lw=0.9, alpha=0.9, linestyle="--",
               label="Predicted (LightGBM)")
    ax_ts.fill_between(ix, y_test.values[:n], y_pred[:n], alpha=0.07, color=PURPLE)
    _style(ax_ts, f"Actual vs Predicted — RMSE: {metrics['RMSE']:.3f} Gwei  |  "
                  f"R²: {metrics['R2']:.4f}  |  MAPE: {metrics['MAPE']:.2f}%")
    ax_ts.set_xlabel("Block index (chronological test set)")
    ax_ts.set_ylabel("Gas Price (Gwei)")
    ax_ts.legend(loc="upper right", framealpha=0.2, labelcolor=TEXT,
                 facecolor=PANEL, edgecolor=BORDER, fontsize=9)

    ax_sc.scatter(y_test.values[:n], y_pred[:n], alpha=0.18, s=7,
                  color=PURPLE, edgecolors="none")
    mv = max(y_test.max(), y_pred.max())
    ax_sc.plot([0, mv], [0, mv], color=RED, lw=1.5, linestyle="--", label="Perfect fit")
    _style(ax_sc, "Actual vs Predicted (Scatter)")
    ax_sc.set_xlabel("Actual Gas Price (Gwei)"); ax_sc.set_ylabel("Predicted Gas Price (Gwei)")
    ax_sc.legend(framealpha=0.2, labelcolor=TEXT, facecolor=PANEL, edgecolor=BORDER, fontsize=8)

    top_gain = importance_df.nlargest(15, "gain")
    ax_gain.barh(top_gain["feature"], top_gain["gain"],
                 color=plt.cm.plasma(np.linspace(0.3, 0.9, len(top_gain))))
    _style(ax_gain, "Feature Importance (Gain — split quality)")
    ax_gain.set_xlabel("Total Gain"); ax_gain.invert_yaxis()
    ax_gain.tick_params(axis="y", labelsize=7.5)

    top_spl = importance_df.nlargest(15, "split_count")
    ax_spl.barh(top_spl["feature"], top_spl["split_count"],
                color=plt.cm.viridis(np.linspace(0.3, 0.9, len(top_spl))))
    _style(ax_spl, "Feature Importance (Split Count — usage frequency)")
    ax_spl.set_xlabel("Split Count"); ax_spl.invert_yaxis()
    ax_spl.tick_params(axis="y", labelsize=7.5)

    folds     = [f"Fold {i+1}" for i in range(len(cv_results["rmse_per_fold"]))]
    rmse_vals = cv_results["rmse_per_fold"]
    bar_colors = [GREEN if v <= cv_results["rmse_mean"] else LIME for v in rmse_vals]
    ax_cv.bar(folds, rmse_vals, color=bar_colors, alpha=0.85, width=0.5)
    ax_cv.axhline(cv_results["rmse_mean"], color=RED, lw=1.5, linestyle="--",
                  label=f"Mean RMSE = {cv_results['rmse_mean']:.3f} Gwei")
    ax_cv.axhspan(cv_results["rmse_mean"] - cv_results["rmse_std"],
                  cv_results["rmse_mean"] + cv_results["rmse_std"],
                  alpha=0.12, color=RED, label=f"±1 std = {cv_results['rmse_std']:.3f}")
    _style(ax_cv, f"TimeSeriesSplit Cross-Validation RMSE ({len(folds)} folds)")
    ax_cv.set_xlabel("CV Fold"); ax_cv.set_ylabel("RMSE (Gwei)")
    ax_cv.legend(framealpha=0.2, labelcolor=TEXT, facecolor=PANEL, edgecolor=BORDER, fontsize=9)

    summary = (f"  LightGBM Summary\n  ─────────────────────\n"
               f"  RMSE      : {metrics['RMSE']:.4f} Gwei\n"
               f"  MAE       : {metrics['MAE']:.4f} Gwei\n"
               f"  R²        : {metrics['R2']:.4f}\n"
               f"  MAPE      : {metrics['MAPE']:.2f}%\n"
               f"  Best Iter : {metrics['Best_Iter']}")
    fig.text(0.01, 0.33, summary, fontsize=8.5, color=TEXT, fontfamily="monospace",
             verticalalignment="top",
             bbox=dict(boxstyle="round,pad=0.6", facecolor=PANEL, edgecolor=BORDER, alpha=0.9))

    plt.savefig(save_path, dpi=150, bbox_inches="tight", facecolor=BG)
    print(f"\n[PLOT] Saved → {save_path}")
    plt.close()


# ═══════════════════════════════════════════════════════════════
#  SECTION 8 — MODEL COMPARISON
# ═══════════════════════════════════════════════════════════════

def compare_with_others(lgbm_metrics, data, save_path="lightgbm_comparison.png"):
    """Trains CatBoost, XGBoost, and Random Forest on same data for comparison."""
    all_metrics = {"LightGBM": lgbm_metrics}

    try:
        from catboost import CatBoostRegressor, Pool as CBPool
        cb = CatBoostRegressor(iterations=1000, depth=6, learning_rate=0.05,
                               l2_leaf_reg=5, early_stopping_rounds=50,
                               random_seed=42, verbose=0, allow_writing_files=False)
        vs = int(len(data["X_train"]) * 0.9)
        cb.fit(CBPool(data["X_train"].iloc[:vs], data["y_train"].iloc[:vs]),
               eval_set=CBPool(data["X_train"].iloc[vs:], data["y_train"].iloc[vs:]))
        cp = np.clip(cb.predict(data["X_test"]), 0, None)
        all_metrics["CatBoost"] = {
            "RMSE": np.sqrt(mean_squared_error(data["y_test"], cp)),
            "MAE":  mean_absolute_error(data["y_test"], cp),
            "R2":   r2_score(data["y_test"], cp),
            "MAPE": np.mean(np.abs((data["y_test"] - cp) / (data["y_test"] + 1e-8))) * 100,
        }
        print("[COMPARE] CatBoost done.")
    except ImportError:
        print("[COMPARE] catboost not installed — skipping.")

    try:
        from xgboost import XGBRegressor
        xgb = XGBRegressor(n_estimators=1000, max_depth=5, learning_rate=0.05,
                           subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1,
                           reg_lambda=1.0, objective="reg:squarederror",
                           tree_method="hist", random_state=42, n_jobs=-1,
                           early_stopping_rounds=30, eval_metric="rmse")
        vs = int(len(data["X_train"]) * 0.9)
        xgb.fit(data["X_train"].iloc[:vs], data["y_train"].iloc[:vs],
                eval_set=[(data["X_train"].iloc[vs:], data["y_train"].iloc[vs:])], verbose=False)
        xp = np.clip(xgb.predict(data["X_test"]), 0, None)
        all_metrics["XGBoost"] = {
            "RMSE": np.sqrt(mean_squared_error(data["y_test"], xp)),
            "MAE":  mean_absolute_error(data["y_test"], xp),
            "R2":   r2_score(data["y_test"], xp),
            "MAPE": np.mean(np.abs((data["y_test"] - xp) / (data["y_test"] + 1e-8))) * 100,
        }
        print("[COMPARE] XGBoost done.")
    except ImportError:
        print("[COMPARE] xgboost not installed — skipping.")

    try:
        from sklearn.ensemble import RandomForestRegressor
        rf = RandomForestRegressor(n_estimators=300, max_depth=20, max_features="sqrt",
                                   min_samples_leaf=2, bootstrap=True,
                                   random_state=42, n_jobs=-1)
        rf.fit(data["X_train"], data["y_train"])
        rp = np.clip(rf.predict(data["X_test"]), 0, None)
        all_metrics["RandomForest"] = {
            "RMSE": np.sqrt(mean_squared_error(data["y_test"], rp)),
            "MAE":  mean_absolute_error(data["y_test"], rp),
            "R2":   r2_score(data["y_test"], rp),
            "MAPE": np.mean(np.abs((data["y_test"] - rp) / (data["y_test"] + 1e-8))) * 100,
        }
        print("[COMPARE] RandomForest done.")
    except Exception as e:
        print(f"[COMPARE] RandomForest failed: {e}")

    models  = list(all_metrics.keys())
    PALETTE = ["#a5d65b", "#39d0d8", "#f0883e", "#bc8cff"]
    BG, PANEL, TEXT = "#0d1117", "#161b22", "#e6edf3"
    fig, axes = plt.subplots(1, 4, figsize=(18, 5), facecolor=BG)
    fig.suptitle("LightGBM vs CatBoost vs XGBoost vs RandomForest",
                 color=TEXT, fontsize=13, fontweight="bold")
    for ax, (metric, lower) in zip(axes, [("RMSE", True), ("MAE", True), ("R2", False), ("MAPE", True)]):
        vals  = [all_metrics[m].get(metric, 0) for m in models]
        bars  = ax.bar(models, vals, color=PALETTE[:len(models)], alpha=0.85, width=0.5)
        bv    = min(vals) if lower else max(vals)
        wi    = vals.index(bv)
        bars[wi].set_edgecolor("white"); bars[wi].set_linewidth(2)
        ax.text(wi, max(vals) * 1.03, "✓", ha="center", color="white", fontsize=10, fontweight="bold")
        ax.set_facecolor(PANEL)
        ax.set_title(f"{metric}\n{'Lower' if lower else 'Higher'} is better", color=TEXT, fontsize=10)
        ax.tick_params(colors="#8b949e", labelsize=7.5)
        ax.set_xticklabels(models, rotation=12, ha="right")
        for s in ax.spines.values(): s.set_edgecolor("#30363d")
        for bar, val in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() * 0.5,
                    f"{val:.4f}", ha="center", va="center", color="white", fontsize=8, fontweight="bold")
    patches = [mpatches.Patch(color=PALETTE[i], label=m) for i, m in enumerate(models)]
    fig.legend(handles=patches, loc="lower center", ncol=len(models),
               framealpha=0.2, labelcolor=TEXT, facecolor=PANEL, edgecolor="#30363d", fontsize=9)
    plt.tight_layout(rect=[0, 0.1, 1, 0.93])
    plt.savefig(save_path, dpi=150, bbox_inches="tight", facecolor=BG)
    print(f"[COMPARE] Saved → {save_path}")
    plt.close()


# ═══════════════════════════════════════════════════════════════
#  SECTION 9 — SERIALIZATION
# ═══════════════════════════════════════════════════════════════

def save_model(model, feature_names, model_dir="lightgbm_model_artifacts"):
    os.makedirs(model_dir, exist_ok=True)
    # Save via joblib (preserves sklearn API) and also native LightGBM format
    joblib.dump(model, os.path.join(model_dir, "lgbm_gas_fee_model.joblib"))
    model.booster_.save_model(os.path.join(model_dir, "lgbm_gas_fee_model.txt"))
    joblib.dump(feature_names, os.path.join(model_dir, "feature_names.joblib"))
    print(f"[SAVE] Model (joblib) → {model_dir}/lgbm_gas_fee_model.joblib")
    print(f"[SAVE] Model (native) → {model_dir}/lgbm_gas_fee_model.txt")
    print(f"[SAVE] Features       → {model_dir}/feature_names.joblib")


def load_model(model_dir="lightgbm_model_artifacts") -> tuple:
    model         = joblib.load(os.path.join(model_dir, "lgbm_gas_fee_model.joblib"))
    feature_names = joblib.load(os.path.join(model_dir, "feature_names.joblib"))
    print(f"[LOAD] Loaded from {model_dir}/")
    return model, feature_names


# ═══════════════════════════════════════════════════════════════
#  SECTION 10 — INFERENCE HELPER (for FastAPI)
# ═══════════════════════════════════════════════════════════════

def predict_gas_fee(model, feature_names, raw_input: dict) -> float:
    """Single-sample inference for FastAPI /predict endpoint."""
    df = pd.DataFrame([raw_input])
    df["timestamp"]     = pd.to_datetime(df.get("timestamp", [pd.Timestamp.utcnow()]))
    df["hour"]          = df["timestamp"].dt.hour
    df["day_of_week"]   = df["timestamp"].dt.dayofweek
    df["is_weekend"]    = (df["day_of_week"] >= 5).astype(int)
    df["month"]         = df["timestamp"].dt.month
    df["hour_sin"]      = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]      = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]       = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]       = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["block_utilization"] = df["gas_used"] / df["gas_limit"]
    df["tx_density"]        = df["transaction_count"] / df["gas_limit"] * 1e6
    df["base_fee_gwei"]     = df.get("base_fee", pd.Series([30e9])) / 1e9
    df["priority_fee_gwei"] = df.get("priority_fee", pd.Series([2e9])) / 1e9
    df["mempool_pressure"]  = df.get("mempool_size", pd.Series([500])) / (df["transaction_count"] + 1)
    for feat in feature_names:
        if feat not in df.columns:
            df[feat] = 0.0
    X = df[feature_names].fillna(0)
    return float(max(0.0, model.predict(X)[0]))


# ═══════════════════════════════════════════════════════════════
#  MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════

def main(csv_path=None, tune=False, n_blocks=5000, use_web3=False, rpc_url=None, compare=False):
    """
    End-to-end LightGBM gas fee prediction pipeline:
      1. Load / simulate data
      2. Feature engineering + chronological split
      3. Train LightGBM (optional hyperparameter tuning)
      4. Cross-validation
      5. Evaluate on test set
      6. Feature importance (Gain + Split Count)
      7. Visualize results
      8. (Optional) Compare vs CatBoost / XGBoost / Random Forest
      9. Save model artifacts
    """
    print("\n" + "═"*62)
    print("  GAS FEE PREDICTION — LightGBM Training Pipeline")
    print("═"*62)
    df         = load_or_simulate_data(csv_path, n_blocks, use_web3, rpc_url)
    data       = preprocess(df)
    model      = train_lightgbm(data["X_train"], data["y_train"], tune=tune)
    cv_results = cross_validate_lightgbm(model, data["X_train"], data["y_train"])
    results    = evaluate_model(model, data["X_test"], data["y_test"])
    imp_df     = compute_feature_importance(model, data["X_test"], data["y_test"],
                                            data["feature_names"])
    plot_results(data["y_test"], results["y_pred"], imp_df, cv_results,
                 results["metrics"], save_path="lightgbm_gas_fee_results.png")
    if compare:
        compare_with_others(results["metrics"], data, save_path="lightgbm_comparison.png")
    save_model(model, data["feature_names"])
    print("\n[DONE] LightGBM pipeline complete!")
    return model, data["feature_names"], results["metrics"]


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Gas Fee Prediction — LightGBM Pipeline")
    parser.add_argument("--csv",     type=str,  default=None)
    parser.add_argument("--web3",    action="store_true")
    parser.add_argument("--rpc",     type=str,  default=None)
    parser.add_argument("--blocks",  type=int,  default=5000)
    parser.add_argument("--tune",    action="store_true")
    parser.add_argument("--compare", action="store_true")
    args = parser.parse_args()
    main(csv_path=args.csv, tune=args.tune, n_blocks=args.blocks,
         use_web3=args.web3, rpc_url=args.rpc, compare=args.compare)
