"""
=============================================================================
  GAS FEE PREDICTION MODEL — Random Forest Blockchain Analytics Engine
=============================================================================
Author: ML Engineering Team
Description:
    Predicts Ethereum gas fees using Random Forest Regression on historical
    blockchain data. Fully parallel to the XGBoost model — same data pipeline,
    same features, same evaluation — so you can compare both directly.

Why Random Forest for Gas Fees?
  - Ensemble of decorrelated decision trees → reduces variance dramatically
  - Naturally parallel training (each tree is independent) → fast on multi-core
  - No feature scaling required (tree-based, scale-invariant)
  - Out-of-Bag (OOB) error gives a free validation score without a hold-out set
  - Robust to outliers (gas price spikes don't skew splits like in linear models)
  - Feature importance via mean decrease in impurity (MDI) — very interpretable
  - Less prone to overfitting than a single deep decision tree
  - Handles high-dimensional feature spaces well (35+ engineered features)

XGBoost vs Random Forest — when to pick which:
  ┌─────────────────────────┬──────────────────┬──────────────────┐
  │ Criterion               │ XGBoost          │ Random Forest    │
  ├─────────────────────────┼──────────────────┼──────────────────┤
  │ Training speed          │ Faster (boosting)│ Slower (parallel)│
  │ Inference speed         │ Faster           │ Slightly slower  │
  │ Overfitting resistance  │ Needs tuning     │ More robust      │
  │ Hyperparameter tuning   │ Many params      │ Fewer params     │
  │ Noisy features          │ OK               │ Very robust      │
  │ Interpretability        │ Good             │ Excellent (OOB)  │
  └─────────────────────────┴──────────────────┴──────────────────┘

Run:
    python rf_gas_fee_model.py                          # simulate + train
    python rf_gas_fee_model.py --csv blockchain_data.csv  # real CSV data
    python rf_gas_fee_model.py --web3 --rpc <URL>         # live Web3 data
    python rf_gas_fee_model.py --tune                      # hyperparameter search
    python rf_gas_fee_model.py --compare                   # compare RF vs XGBoost
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
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.inspection import permutation_importance

warnings.filterwarnings("ignore")


# ═══════════════════════════════════════════════════════════════
#  SECTION 1 — DATA SIMULATION (identical to XGBoost model)
# ═══════════════════════════════════════════════════════════════

def simulate_blockchain_data(n_blocks: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Simulates realistic Ethereum-like blockchain data with EIP-1559 mechanics.

    Patterns baked in:
      - Base fee adjusts ±12.5% per block based on utilization vs 50% target
      - Higher tx counts during business hours (UTC 9–17)
      - Priority fees scale with mempool pressure (congestion → higher tips)
      - ~3% missing values in mempool_size and priority_fee (realistic noise)

    Args:
        n_blocks: Number of blocks to simulate
        seed:     Random seed for reproducibility

    Returns:
        pd.DataFrame with raw blockchain features + target gas_price_gwei
    """
    np.random.seed(seed)

    start_time    = datetime(2024, 3, 1)
    timestamps    = [start_time + timedelta(seconds=12 * i) for i in range(n_blocks)]
    block_numbers = np.arange(19_000_000, 19_000_000 + n_blocks)

    # Gas limit: stable around 30M post-merge
    gas_limit = np.random.normal(30_000_000, 500_000, n_blocks).clip(15_000_000, 36_000_000)

    # Transaction count: peaks around 3pm UTC (business hours effect)
    hour_of_day       = np.array([t.hour for t in timestamps])
    tx_base           = 150 + 80 * np.sin((hour_of_day - 9) * np.pi / 12)
    transaction_count = np.random.normal(tx_base, 30, n_blocks).clip(10, 300).astype(int)

    # Gas used: proportional to tx count
    gas_used_ratio = (transaction_count / 300) * np.random.normal(0.85, 0.1, n_blocks)
    gas_used_ratio = gas_used_ratio.clip(0.1, 1.0)
    gas_used       = (gas_used_ratio * gas_limit).astype(int)

    # EIP-1559 base fee: adjusts each block based on utilization
    base_fee    = np.zeros(n_blocks)
    base_fee[0] = 30e9  # Start at 30 Gwei

    for i in range(1, n_blocks):
        utilization = gas_used[i - 1] / gas_limit[i - 1]
        delta       = (utilization - 0.5) / 0.5
        base_fee[i] = base_fee[i - 1] * (1 + 0.125 * delta)
        base_fee[i] = np.clip(base_fee[i], 1e9, 500e9)

    # Priority fee: user tips, correlated with congestion
    mempool_pressure = gas_used / gas_limit
    priority_fee     = (np.random.lognormal(1.5, 0.8, n_blocks) * 1e9 * mempool_pressure).clip(1e9, 50e9)

    # Mempool size: grows with congestion
    mempool_size = (transaction_count * np.random.uniform(2, 8, n_blocks)).astype(int)

    # Target: effective gas price in Gwei (what users actually pay)
    gas_price_gwei = (base_fee + priority_fee) / 1e9

    df = pd.DataFrame({
        "block_number":      block_numbers,
        "timestamp":         timestamps,
        "gas_used":          gas_used,
        "gas_limit":         gas_limit,
        "base_fee":          base_fee,
        "transaction_count": transaction_count,
        "mempool_size":      mempool_size,
        "priority_fee":      priority_fee,
        "gas_price_gwei":    gas_price_gwei,
    })

    # Inject ~3% missing values (realistic for live pipelines)
    for col in ["mempool_size", "priority_fee"]:
        mask           = np.random.rand(n_blocks) < 0.03
        df.loc[mask, col] = np.nan

    return df


def load_or_simulate_data(csv_path: str = None, n_blocks: int = 5000,
                           use_web3: bool = False, rpc_url: str = None) -> pd.DataFrame:
    """
    Loads data from CSV → Web3 live fetch → simulation (in priority order).

    Args:
        csv_path:  Path to existing CSV file
        n_blocks:  Blocks to fetch/simulate if no CSV provided
        use_web3:  Fetch real Ethereum data via data_collector.py
        rpc_url:   Infura/Alchemy RPC URL (or set RPC_URL in .env)
    """
    if csv_path and os.path.exists(csv_path):
        print(f"[DATA] Loading CSV: {csv_path}")
        df = pd.read_csv(csv_path, parse_dates=["timestamp"])
        print(f"[DATA] Loaded {len(df):,} rows")
        return df

    if use_web3:
        try:
            from data_collector import get_real_data
            print(f"[DATA] Fetching {n_blocks} real blocks via Web3...")
            df = get_real_data(rpc_url=rpc_url, n_blocks=n_blocks,
                               output_csv=csv_path or "blockchain_data.csv")
            print(f"[DATA] Collected {len(df):,} blocks")
            return df
        except ImportError:
            print("[WARN] data_collector.py not found — falling back to simulation")
        except Exception as e:
            print(f"[WARN] Web3 failed ({e}) — falling back to simulation")

    print("[DATA] Simulating blockchain data...")
    df = simulate_blockchain_data(n_blocks)
    print(f"[DATA] Simulated {len(df):,} blocks")
    return df


# ═══════════════════════════════════════════════════════════════
#  SECTION 2 — FEATURE ENGINEERING (same as XGBoost model)
# ═══════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw blockchain data into 35 ML-ready features.

    Feature groups:
      1. Temporal (cyclical sin/cos encoding) — gas prices follow UTC cycles
      2. Block utilization ratios             — core congestion signal
      3. Rolling averages (5, 15, 50 blocks)  — smoothed trend context
      4. Lag features (1–10 blocks back)      — strong autocorrelation
      5. EIP-1559 velocity / acceleration     — base fee momentum
      6. Mempool pressure                     — demand-side signal

    IMPORTANT: All rolling/lag features use .shift(1) to ensure no data
    leakage — only information available at prediction time is used.
    """
    df = df.copy().sort_values("block_number").reset_index(drop=True)

    # ── 1. Temporal (cyclical encoding preserves circular distance)
    df["hour"]        = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_weekend"]  = (df["day_of_week"] >= 5).astype(int)
    df["month"]       = df["timestamp"].dt.month
    df["hour_sin"]    = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]    = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]     = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]     = np.cos(2 * np.pi * df["day_of_week"] / 7)

    # ── 2. Utilization ratios
    df["block_utilization"] = df["gas_used"] / df["gas_limit"]
    df["tx_density"]        = df["transaction_count"] / df["gas_limit"] * 1e6

    # ── 3. Rolling statistics (shift(1) prevents leakage)
    for window in [5, 15, 50]:
        df[f"base_fee_roll_{window}"]    = df["base_fee"].shift(1).rolling(window, min_periods=1).mean()
        df[f"utilization_roll_{window}"] = df["block_utilization"].shift(1).rolling(window, min_periods=1).mean()
        df[f"tx_count_roll_{window}"]    = df["transaction_count"].shift(1).rolling(window, min_periods=1).mean()

    # ── 4. Lag features (most powerful predictor category)
    for lag in [1, 2, 3, 5, 10]:
        df[f"gas_price_lag_{lag}"] = df["gas_price_gwei"].shift(lag)
        df[f"base_fee_lag_{lag}"]  = df["base_fee"].shift(lag)

    # ── 5. EIP-1559 momentum
    df["base_fee_pct_change"]   = df["base_fee"].pct_change(1).replace([np.inf, -np.inf], 0)
    df["base_fee_acceleration"] = df["base_fee_pct_change"].diff(1)

    # ── 6. Mempool (fill NaN with rolling median — common in live data)
    df["mempool_size"]  = df["mempool_size"].fillna(df["mempool_size"].rolling(10, min_periods=1).median())
    df["priority_fee"]  = df["priority_fee"].fillna(df["priority_fee"].rolling(10, min_periods=1).median())
    df["mempool_pressure"]  = df["mempool_size"] / (df["transaction_count"] + 1)
    df["priority_fee_gwei"] = df["priority_fee"] / 1e9
    df["base_fee_gwei"]     = df["base_fee"] / 1e9

    return df


def select_features(df: pd.DataFrame) -> tuple:
    """Returns X (features), y (target), and list of feature names."""
    drop_cols    = ["block_number", "timestamp", "gas_price_gwei",
                    "base_fee", "priority_fee", "hour", "day_of_week", "month"]
    feature_cols = [c for c in df.columns if c not in drop_cols]
    X            = df[feature_cols].copy()
    y            = df["gas_price_gwei"].copy()
    return X, y, feature_cols


def preprocess(df: pd.DataFrame, test_size: float = 0.2) -> dict:
    """
    Full preprocessing pipeline with chronological train/test split.

    CRITICAL: We never shuffle time-series data. The last `test_size`
    fraction of blocks is the test set — always future relative to training.
    This mirrors real deployment conditions.

    NaN strategy:
      - Lag/rolling columns: ffill → bfill → 0  (never drop rows for these)
      - Target column: drop rows where gas_price_gwei is NaN
      - Remaining feature NaNs: fill with column median as final fallback
    """
    print("[PREPROCESS] Engineering features...")

    # Ensure timestamp is a proper datetime (handles CSV string timestamps)
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df["timestamp"] = df["timestamp"].fillna(pd.Timestamp("2024-01-01"))

    df_feat = engineer_features(df)

    # Show NaN breakdown so failures are never mysterious
    nan_counts = df_feat.isna().sum()
    nan_cols   = nan_counts[nan_counts > 0]
    if not nan_cols.empty:
        print(f"[PREPROCESS] NaN counts before fill:")
        for col, cnt in nan_cols.items():
            print(f"             {col:35s}: {cnt}")

    # Fill lag/rolling NaNs with ffill → bfill → 0 (keeps all rows)
    lag_roll_cols = [c for c in df_feat.columns
                     if any(tag in c for tag in
                            ["_lag_", "_roll_", "_pct_change", "_acceleration"])]
    df_feat[lag_roll_cols] = (df_feat[lag_roll_cols]
                               .ffill()
                               .bfill()
                               .fillna(0))

    # Only drop rows where the TARGET itself is missing
    df_feat = df_feat.dropna(subset=["gas_price_gwei"]).reset_index(drop=True)
    print(f"[PREPROCESS] Rows after NaN handling: {len(df_feat):,}")

    if len(df_feat) == 0:
        raise ValueError(
            "Dataset is empty after preprocessing. "
            "Check that your data has a valid 'gas_price_gwei' column."
        )

    X, y, feature_names = select_features(df_feat)

    # Final fallback: fill any remaining feature NaNs with column median
    X = X.fillna(X.median(numeric_only=True)).fillna(0)

    # Chronological split — NO random shuffle
    split_idx       = int(len(X) * (1 - test_size))
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    if len(X_train) == 0:
        raise ValueError(
            f"X_train is empty (total rows={len(X)}, split_idx={split_idx}). "
            "Dataset is too small — increase --blocks or check your CSV."
        )

    print(f"[PREPROCESS] Train: {len(X_train):,} | Test: {len(X_test):,} | Features: {len(feature_names)}")

    return {
        "X_train":       X_train,
        "X_test":        X_test,
        "y_train":       y_train,
        "y_test":        y_test,
        "feature_names": feature_names,
        "df_feat":       df_feat,
    }


# ═══════════════════════════════════════════════════════════════
#  SECTION 3 — RANDOM FOREST MODEL
# ═══════════════════════════════════════════════════════════════

def tune_random_forest(X_train: pd.DataFrame, y_train: pd.Series,
                        n_iter: int = 30, cv_folds: int = 5) -> dict:
    """
    Hyperparameter search for Random Forest using RandomizedSearchCV
    with TimeSeriesSplit cross-validation.

    Key parameters to tune:
      n_estimators:     More trees → lower variance, diminishing returns after ~300
      max_depth:        Limits tree depth → prevents memorizing noise in fee spikes
      max_features:     Features considered per split → decorrelates trees
      min_samples_leaf: Minimum samples at leaf → smooths predictions
      min_samples_split:Minimum to split a node → controls granularity
      bootstrap:        Sampling with replacement → enables OOB error estimation
      max_samples:      Fraction of data per tree → additional randomness

    Args:
        X_train, y_train: Training data
        n_iter:           Hyperparameter combinations to try
        cv_folds:         TimeSeriesSplit folds

    Returns:
        dict of best hyperparameters
    """
    print(f"\n[TUNE] RandomizedSearchCV — {n_iter} iterations, {cv_folds}-fold TimeSeriesCV...")

    param_dist = {
        "n_estimators":     [100, 200, 300, 500, 750],
        "max_depth":        [None, 10, 15, 20, 30],     # None = fully grown trees
        "max_features":     ["sqrt", "log2", 0.3, 0.5, 0.7],
        "min_samples_leaf": [1, 2, 4, 8, 16],
        "min_samples_split":[2, 5, 10, 20],
        "bootstrap":        [True, False],
        "max_samples":      [0.6, 0.7, 0.8, 0.9, None], # None = use all (if bootstrap=True)
    }

    tscv = TimeSeriesSplit(n_splits=cv_folds)

    base_model = RandomForestRegressor(
        random_state = 42,
        n_jobs       = -1,   # Use all CPU cores
        oob_score    = False, # Disable during tuning for speed
    )

    search = RandomizedSearchCV(
        estimator            = base_model,
        param_distributions  = param_dist,
        n_iter               = n_iter,
        scoring              = "neg_root_mean_squared_error",
        cv                   = tscv,
        verbose              = 1,
        random_state         = 42,
        n_jobs               = -1,
    )

    search.fit(X_train, y_train)

    print(f"[TUNE] Best CV RMSE : {-search.best_score_:.4f} Gwei")
    print(f"[TUNE] Best params  : {search.best_params_}")

    return search.best_params_


def train_random_forest(X_train: pd.DataFrame, y_train: pd.Series,
                         params: dict = None, tune: bool = False) -> RandomForestRegressor:
    """
    Trains the Random Forest model with optional hyperparameter tuning.

    Overfitting Prevention Strategies in Random Forest:
      ┌────────────────────────┬─────────────────────────────────────────────┐
      │ Technique              │ How it helps                                │
      ├────────────────────────┼─────────────────────────────────────────────┤
      │ Bootstrap sampling     │ Each tree sees ~63% of data (random subset) │
      │ max_features           │ Random feature subset per split decorrelates │
      │ max_depth              │ Limits tree complexity, prevents memorizing  │
      │ min_samples_leaf       │ Forces minimum support for each prediction   │
      │ OOB validation         │ Free out-of-bag error estimate during train  │
      └────────────────────────┴─────────────────────────────────────────────┘

    Args:
        X_train, y_train: Training data
        params:           Pre-defined hyperparameters (skips tuning if given)
        tune:             Run hyperparameter search first

    Returns:
        Trained RandomForestRegressor
    """
    if tune and params is None:
        params = tune_random_forest(X_train, y_train)

    # Production-tested defaults for gas fee prediction
    default_params = {
        "n_estimators":      300,      # 300 trees — good bias-variance balance
        "max_depth":         20,       # Cap depth to prevent overfitting spikes
        "max_features":      "sqrt",   # sqrt(n_features) per split — standard RF
        "min_samples_leaf":  2,        # At least 2 samples per leaf
        "min_samples_split": 5,        # At least 5 to attempt a split
        "bootstrap":         True,     # Enable bootstrap → enables OOB score
        "oob_score":         True,     # Free validation estimate (no hold-out needed)
        "max_samples":       0.8,      # Each tree uses 80% of training data
        "random_state":      42,
        "n_jobs":            -1,       # Use all available CPU cores
        "warm_start":        False,
    }

    if params:
        default_params.update(params)

    print("\n[TRAIN] Fitting Random Forest model...")
    t0    = time.time()
    model = RandomForestRegressor(**default_params)
    model.fit(X_train, y_train)
    elapsed = time.time() - t0

    print(f"[TRAIN] Training time    : {elapsed:.1f}s")
    print(f"[TRAIN] Trees trained    : {model.n_estimators}")
    print(f"[TRAIN] OOB R² Score     : {model.oob_score_:.4f}  ← free validation, no hold-out needed")
    print(f"[TRAIN] Features used    : {model.n_features_in_}")

    return model


# ═══════════════════════════════════════════════════════════════
#  SECTION 4 — CROSS-VALIDATION
# ═══════════════════════════════════════════════════════════════

def cross_validate_rf(model: RandomForestRegressor, X_train: pd.DataFrame,
                       y_train: pd.Series, cv_folds: int = 5) -> dict:
    """
    TimeSeriesSplit cross-validation on the training set.

    Why TimeSeriesSplit (not KFold)?
      Standard KFold shuffles data randomly — this leaks future information
      into past folds. TimeSeriesSplit always trains on past, validates on
      future within the training set, exactly like real deployment.

      Fold structure (5-fold example):
        Fold 1: Train [0–20%]   Validate [20–40%]
        Fold 2: Train [0–40%]   Validate [40–60%]
        Fold 3: Train [0–60%]   Validate [60–80%]
        Fold 4: Train [0–80%]   Validate [80–100%]

    Args:
        model:     Trained or fresh RandomForestRegressor
        X_train, y_train: Training data
        cv_folds:  Number of folds

    Returns:
        dict with per-fold and mean metrics
    """
    print(f"\n[CV] Running {cv_folds}-fold TimeSeriesSplit cross-validation...")
    tscv = TimeSeriesSplit(n_splits=cv_folds)

    rmse_scores = []
    mae_scores  = []
    r2_scores   = []

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X_train), 1):
        X_tr = X_train.iloc[train_idx]
        y_tr = y_train.iloc[train_idx]
        X_vl = X_train.iloc[val_idx]
        y_vl = y_train.iloc[val_idx]

        # Clone model to avoid contaminating the trained one
        fold_model = RandomForestRegressor(
            **{k: getattr(model, k)
               for k in ["n_estimators", "max_depth", "max_features",
                         "min_samples_leaf", "min_samples_split",
                         "bootstrap", "random_state", "n_jobs"]},
            oob_score=False,
        )
        fold_model.fit(X_tr, y_tr)
        y_pred = fold_model.predict(X_vl)

        rmse  = np.sqrt(mean_squared_error(y_vl, y_pred))
        mae   = mean_absolute_error(y_vl, y_pred)
        r2    = r2_score(y_vl, y_pred)

        rmse_scores.append(rmse)
        mae_scores.append(mae)
        r2_scores.append(r2)

        print(f"  Fold {fold}: RMSE={rmse:.3f}  MAE={mae:.3f}  R²={r2:.4f}")

    cv_results = {
        "rmse_mean": np.mean(rmse_scores), "rmse_std": np.std(rmse_scores),
        "mae_mean":  np.mean(mae_scores),  "mae_std":  np.std(mae_scores),
        "r2_mean":   np.mean(r2_scores),   "r2_std":   np.std(r2_scores),
        "rmse_per_fold": rmse_scores,
    }

    print(f"\n[CV] Summary:")
    print(f"  RMSE : {cv_results['rmse_mean']:.4f} ± {cv_results['rmse_std']:.4f} Gwei")
    print(f"  MAE  : {cv_results['mae_mean']:.4f} ± {cv_results['mae_std']:.4f} Gwei")
    print(f"  R²   : {cv_results['r2_mean']:.4f} ± {cv_results['r2_std']:.4f}")

    return cv_results


# ═══════════════════════════════════════════════════════════════
#  SECTION 5 — EVALUATION
# ═══════════════════════════════════════════════════════════════

def evaluate_model(model: RandomForestRegressor, X_test: pd.DataFrame,
                    y_test: pd.Series) -> dict:
    """
    Evaluates the model on the chronological hold-out test set.

    Metrics:
      RMSE  — Root Mean Squared Error: penalises large errors (fee spikes)
      MAE   — Mean Absolute Error: average absolute deviation in Gwei
      R²    — Coefficient of determination: 1.0 = perfect, 0 = predicts mean
      MAPE  — Mean Absolute Percentage Error: scale-independent accuracy
      OOB   — Out-of-Bag R² (from training): free internal validation score
    """
    y_pred = np.clip(model.predict(X_test), 0, None)

    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100

    print("\n" + "═"*52)
    print("  RANDOM FOREST — EVALUATION RESULTS")
    print("═"*52)
    print(f"  RMSE        : {rmse:.4f} Gwei")
    print(f"  MAE         : {mae:.4f} Gwei")
    print(f"  R²          : {r2:.4f}")
    print(f"  MAPE        : {mape:.2f}%")
    print(f"  OOB R²      : {model.oob_score_:.4f}  (training-time estimate)")
    print("═"*52)

    return {
        "metrics": {"RMSE": rmse, "MAE": mae, "R2": r2, "MAPE": mape,
                    "OOB_R2": model.oob_score_},
        "y_pred":  y_pred,
    }


# ═══════════════════════════════════════════════════════════════
#  SECTION 6 — FEATURE IMPORTANCE (two methods)
# ═══════════════════════════════════════════════════════════════

def compute_feature_importance(model: RandomForestRegressor,
                                X_test: pd.DataFrame, y_test: pd.Series,
                                feature_names: list) -> pd.DataFrame:
    """
    Computes feature importance using two complementary methods:

    1. MDI (Mean Decrease in Impurity) — built-in RF importance.
       Fast but can overstate importance of high-cardinality features.

    2. Permutation Importance — shuffles each feature and measures
       the drop in R². More reliable but slower.

    Returns a DataFrame combining both, sorted by MDI importance.
    """
    print("\n[IMPORTANCE] Computing feature importances...")

    # Method 1: MDI (built-in)
    mdi = model.feature_importances_

    # Method 2: Permutation (on test set — measures actual predictive contribution)
    perm = permutation_importance(
        model, X_test, y_test,
        n_repeats   = 10,
        random_state= 42,
        n_jobs      = -1,
    )

    importance_df = pd.DataFrame({
        "feature":              feature_names,
        "mdi_importance":       mdi,
        "permutation_mean":     perm.importances_mean,
        "permutation_std":      perm.importances_std,
    }).sort_values("mdi_importance", ascending=False).reset_index(drop=True)

    print(f"\n  Top 10 Features (MDI):")
    for _, row in importance_df.head(10).iterrows():
        bar = "█" * int(row["mdi_importance"] * 300)
        print(f"  {row['feature']:30s} {row['mdi_importance']:.4f}  {bar}")

    return importance_df


# ═══════════════════════════════════════════════════════════════
#  SECTION 7 — VISUALIZATION
# ═══════════════════════════════════════════════════════════════

def plot_results(y_test: pd.Series, y_pred: np.ndarray,
                  importance_df: pd.DataFrame, cv_results: dict,
                  metrics: dict, save_path: str = "rf_gas_fee_results.png"):
    """
    5-panel diagnostic dashboard:
      1. Actual vs Predicted time series (full test set)
      2. Scatter: Actual vs Predicted + perfect-fit line
      3. MDI Feature Importance (top 15)
      4. Permutation Importance (top 15) — more reliable measure
      5. Cross-validation RMSE across folds

    Args:
        y_test:        True gas prices (test set)
        y_pred:        Model predictions
        importance_df: Feature importance DataFrame (from compute_feature_importance)
        cv_results:    Cross-validation results dict
        metrics:       Evaluation metrics dict
        save_path:     Where to save the PNG
    """
    BG      = "#0d1117"
    PANEL   = "#161b22"
    BORDER  = "#30363d"
    TEXT    = "#e6edf3"
    MUTED   = "#8b949e"
    BLUE    = "#58a6ff"
    GREEN   = "#3fb950"
    ORANGE  = "#f0883e"
    PURPLE  = "#bc8cff"
    RED     = "#f85149"

    fig = plt.figure(figsize=(20, 16), facecolor=BG)
    fig.suptitle(
        "🌲  Gas Fee Prediction — Random Forest Diagnostic Dashboard",
        fontsize=17, color=TEXT, fontweight="bold", y=0.98
    )

    gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.5, wspace=0.38,
                           top=0.94, bottom=0.06, left=0.06, right=0.97)

    ax_ts   = fig.add_subplot(gs[0, :])    # Full-width time series
    ax_sc   = fig.add_subplot(gs[1, 0])    # Scatter
    ax_mdi  = fig.add_subplot(gs[1, 1])    # MDI importance
    ax_perm = fig.add_subplot(gs[1, 2])    # Permutation importance
    ax_cv   = fig.add_subplot(gs[2, :])    # Cross-validation RMSE

    def _style(ax, title):
        ax.set_facecolor(PANEL)
        ax.tick_params(colors=MUTED, labelsize=8.5)
        ax.xaxis.label.set_color(MUTED)
        ax.yaxis.label.set_color(MUTED)
        ax.set_title(title, color=TEXT, fontsize=11, pad=10, fontweight="semibold")
        for s in ax.spines.values():
            s.set_edgecolor(BORDER)
        ax.grid(True, color="#21262d", linewidth=0.7, linestyle="--", alpha=0.8)

    n_show = min(800, len(y_test))
    idx    = np.arange(n_show)

    # ── 1. Time Series
    ax_ts.plot(idx, y_test.values[:n_show],  color=BLUE,   lw=0.9, alpha=0.9, label="Actual")
    ax_ts.plot(idx, y_pred[:n_show],         color=ORANGE, lw=0.9, alpha=0.9,
               linestyle="--", label="Predicted (RF)")
    ax_ts.fill_between(idx, y_test.values[:n_show], y_pred[:n_show],
                       alpha=0.07, color=PURPLE)
    _style(ax_ts, f"Actual vs Predicted Gas Fees — RMSE: {metrics['RMSE']:.3f} Gwei  |  R²: {metrics['R2']:.4f}  |  MAPE: {metrics['MAPE']:.2f}%")
    ax_ts.set_xlabel("Block index (chronological test set)")
    ax_ts.set_ylabel("Gas Price (Gwei)")
    ax_ts.legend(loc="upper right", framealpha=0.2, labelcolor=TEXT,
                 facecolor=PANEL, edgecolor=BORDER, fontsize=9)

    # ── 2. Scatter
    ax_sc.scatter(y_test.values[:n_show], y_pred[:n_show],
                  alpha=0.18, s=7, color=PURPLE, edgecolors="none")
    mv = max(y_test.max(), y_pred.max())
    ax_sc.plot([0, mv], [0, mv], color=RED, lw=1.5, linestyle="--", label="Perfect fit")
    _style(ax_sc, "Actual vs Predicted (Scatter)")
    ax_sc.set_xlabel("Actual Gas Price (Gwei)")
    ax_sc.set_ylabel("Predicted Gas Price (Gwei)")
    ax_sc.legend(framealpha=0.2, labelcolor=TEXT, facecolor=PANEL,
                 edgecolor=BORDER, fontsize=8)

    # ── 3. MDI Feature Importance (top 15)
    top_mdi  = importance_df.nlargest(15, "mdi_importance")
    colors_m = plt.cm.plasma(np.linspace(0.3, 0.9, len(top_mdi)))
    ax_mdi.barh(top_mdi["feature"], top_mdi["mdi_importance"], color=colors_m)
    _style(ax_mdi, "Feature Importance (MDI)")
    ax_mdi.set_xlabel("Mean Decrease in Impurity")
    ax_mdi.invert_yaxis()
    ax_mdi.tick_params(axis="y", labelsize=7.5)

    # ── 4. Permutation Importance (top 15)
    top_perm  = importance_df.nlargest(15, "permutation_mean")
    colors_p  = plt.cm.viridis(np.linspace(0.3, 0.9, len(top_perm)))
    bars = ax_perm.barh(top_perm["feature"], top_perm["permutation_mean"], color=colors_p)
    ax_perm.errorbar(
        top_perm["permutation_mean"],
        range(len(top_perm)),
        xerr=top_perm["permutation_std"],
        fmt="none", color=MUTED, capsize=3, linewidth=1,
    )
    _style(ax_perm, "Permutation Importance (R² drop)")
    ax_perm.set_xlabel("Mean R² Drop on Shuffle")
    ax_perm.invert_yaxis()
    ax_perm.tick_params(axis="y", labelsize=7.5)

    # ── 5. CV RMSE per fold
    folds      = [f"Fold {i+1}" for i in range(len(cv_results["rmse_per_fold"]))]
    rmse_vals  = cv_results["rmse_per_fold"]
    bar_colors = [GREEN if v <= cv_results["rmse_mean"] else ORANGE for v in rmse_vals]
    ax_cv.bar(folds, rmse_vals, color=bar_colors, alpha=0.85, width=0.5)
    ax_cv.axhline(cv_results["rmse_mean"], color=RED, lw=1.5,
                  linestyle="--", label=f"Mean RMSE = {cv_results['rmse_mean']:.3f} Gwei")
    ax_cv.axhspan(
        cv_results["rmse_mean"] - cv_results["rmse_std"],
        cv_results["rmse_mean"] + cv_results["rmse_std"],
        alpha=0.12, color=RED, label=f"±1 std = {cv_results['rmse_std']:.3f}"
    )
    _style(ax_cv, f"TimeSeriesSplit Cross-Validation RMSE ({len(folds)} folds)")
    ax_cv.set_xlabel("CV Fold (each fold's training set is strictly earlier in time)")
    ax_cv.set_ylabel("RMSE (Gwei)")
    ax_cv.legend(framealpha=0.2, labelcolor=TEXT, facecolor=PANEL,
                 edgecolor=BORDER, fontsize=9)

    # Metric summary box
    summary = (
        f"  Random Forest Summary\n"
        f"  ─────────────────────\n"
        f"  RMSE : {metrics['RMSE']:.4f} Gwei\n"
        f"  MAE  : {metrics['MAE']:.4f} Gwei\n"
        f"  R²   : {metrics['R2']:.4f}\n"
        f"  MAPE : {metrics['MAPE']:.2f}%\n"
        f"  OOB  : {metrics['OOB_R2']:.4f}"
    )
    fig.text(0.01, 0.33, summary, fontsize=8.5, color=TEXT,
             fontfamily="monospace", verticalalignment="top",
             bbox=dict(boxstyle="round,pad=0.6", facecolor=PANEL,
                       edgecolor=BORDER, alpha=0.9))

    plt.savefig(save_path, dpi=150, bbox_inches="tight", facecolor=BG)
    print(f"\n[PLOT] Saved diagnostic dashboard → {save_path}")
    plt.close()


# ═══════════════════════════════════════════════════════════════
#  SECTION 8 — MODEL COMPARISON (RF vs XGBoost)
# ═══════════════════════════════════════════════════════════════

def compare_with_xgboost(rf_metrics: dict, data: dict,
                          save_path: str = "model_comparison.png"):
    """
    Trains XGBoost on the same data split and produces a side-by-side
    comparison chart (RMSE, MAE, R², MAPE, training time).

    Requires xgboost to be installed: pip install xgboost

    Args:
        rf_metrics: Metrics dict from evaluate_model() for Random Forest
        data:       Preprocessed data dict (from preprocess())
        save_path:  Where to save the comparison plot
    """
    try:
        from xgboost import XGBRegressor
    except ImportError:
        print("[COMPARE] xgboost not installed. Skipping comparison.")
        return

    print("\n[COMPARE] Training XGBoost on same data split...")

    # Train XGBoost
    xgb = XGBRegressor(
        n_estimators=1000, max_depth=5, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1,
        reg_lambda=1.0, gamma=0.1, objective="reg:squarederror",
        tree_method="hist", random_state=42, n_jobs=-1,
        early_stopping_rounds=30, eval_metric="rmse",
    )
    val_split = int(len(data["X_train"]) * 0.9)
    t0 = time.time()
    xgb.fit(
        data["X_train"].iloc[:val_split], data["y_train"].iloc[:val_split],
        eval_set=[(data["X_train"].iloc[val_split:], data["y_train"].iloc[val_split:])],
        verbose=False,
    )
    xgb_time = time.time() - t0

    xgb_pred = np.clip(xgb.predict(data["X_test"]), 0, None)
    xgb_metrics = {
        "RMSE":  np.sqrt(mean_squared_error(data["y_test"], xgb_pred)),
        "MAE":   mean_absolute_error(data["y_test"], xgb_pred),
        "R2":    r2_score(data["y_test"], xgb_pred),
        "MAPE":  np.mean(np.abs((data["y_test"] - xgb_pred) / (data["y_test"] + 1e-8))) * 100,
    }

    print("\n" + "═"*60)
    print(f"  {'Metric':12s}  {'Random Forest':>16s}  {'XGBoost':>16s}  {'Winner':>10s}")
    print("═"*60)
    for m in ["RMSE", "MAE", "MAPE"]:
        rf_v  = rf_metrics[m]
        xgb_v = xgb_metrics[m]
        win   = "RF ✓" if rf_v < xgb_v else "XGB ✓"
        print(f"  {m:12s}  {rf_v:>16.4f}  {xgb_v:>16.4f}  {win:>10s}")
    rf_r2  = rf_metrics["R2"]
    xgb_r2 = xgb_metrics["R2"]
    win_r2 = "RF ✓" if rf_r2 > xgb_r2 else "XGB ✓"
    print(f"  {'R²':12s}  {rf_r2:>16.4f}  {xgb_r2:>16.4f}  {win_r2:>10s}")
    print("═"*60)

    # Comparison bar chart
    BG, PANEL, TEXT = "#0d1117", "#161b22", "#e6edf3"
    RF_COLOR        = "#3fb950"
    XGB_COLOR       = "#f0883e"

    fig, axes = plt.subplots(1, 4, figsize=(16, 5), facecolor=BG)
    fig.suptitle("Random Forest vs XGBoost — Same Data, Same Features",
                 color=TEXT, fontsize=14, fontweight="bold")

    metrics_to_plot = [
        ("RMSE",  "Lower is better",  True),
        ("MAE",   "Lower is better",  True),
        ("R2",    "Higher is better", False),
        ("MAPE",  "Lower is better",  True),
    ]

    for ax, (metric, subtitle, lower_better) in zip(axes, metrics_to_plot):
        rf_v  = rf_metrics.get(metric, 0)
        xgb_v = xgb_metrics[metric]
        bars  = ax.bar(["Random\nForest", "XGBoost"], [rf_v, xgb_v],
                       color=[RF_COLOR, XGB_COLOR], alpha=0.85, width=0.5)

        # Highlight winner
        win_idx = (0 if (lower_better and rf_v < xgb_v) or
                        (not lower_better and rf_v > xgb_v) else 1)
        bars[win_idx].set_edgecolor("white")
        bars[win_idx].set_linewidth(2)
        ax.text(win_idx, max(rf_v, xgb_v) * 1.03, "✓ Winner",
                ha="center", color="white", fontsize=8, fontweight="bold")

        ax.set_facecolor(PANEL)
        ax.set_title(f"{metric}\n{subtitle}", color=TEXT, fontsize=10)
        ax.tick_params(colors="#8b949e")
        for s in ax.spines.values():
            s.set_edgecolor("#30363d")
        for bar, val in zip(bars, [rf_v, xgb_v]):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() * 0.5,
                    f"{val:.4f}", ha="center", va="center",
                    color="white", fontsize=9, fontweight="bold")

    rf_patch  = mpatches.Patch(color=RF_COLOR,  label="Random Forest")
    xgb_patch = mpatches.Patch(color=XGB_COLOR, label="XGBoost")
    fig.legend(handles=[rf_patch, xgb_patch], loc="lower center",
               ncol=2, framealpha=0.2, labelcolor=TEXT,
               facecolor=PANEL, edgecolor="#30363d", fontsize=10)

    plt.tight_layout(rect=[0, 0.08, 1, 0.95])
    plt.savefig(save_path, dpi=150, bbox_inches="tight", facecolor=BG)
    print(f"[COMPARE] Comparison chart saved → {save_path}")
    plt.close()


# ═══════════════════════════════════════════════════════════════
#  SECTION 9 — SERIALIZATION
# ═══════════════════════════════════════════════════════════════

def save_model(model: RandomForestRegressor, feature_names: list,
                model_dir: str = "rf_model_artifacts"):
    """Saves trained model + feature schema to disk."""
    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(model,         os.path.join(model_dir, "rf_gas_fee_model.joblib"))
    joblib.dump(feature_names, os.path.join(model_dir, "feature_names.joblib"))
    print(f"[SAVE] Model → {model_dir}/rf_gas_fee_model.joblib")
    print(f"[SAVE] Features → {model_dir}/feature_names.joblib")


def load_model(model_dir: str = "rf_model_artifacts") -> tuple:
    """Loads model + feature schema. Returns (model, feature_names)."""
    model         = joblib.load(os.path.join(model_dir, "rf_gas_fee_model.joblib"))
    feature_names = joblib.load(os.path.join(model_dir, "feature_names.joblib"))
    print(f"[LOAD] Model loaded from {model_dir}/")
    return model, feature_names


# ═══════════════════════════════════════════════════════════════
#  SECTION 10 — INFERENCE HELPER (for FastAPI)
# ═══════════════════════════════════════════════════════════════

def predict_gas_fee(model: RandomForestRegressor, feature_names: list,
                     raw_input: dict) -> float:
    """
    Single-sample inference with on-the-fly feature engineering.
    Used by the FastAPI /predict endpoint.

    Args:
        model:         Loaded RandomForestRegressor
        feature_names: Expected feature columns (from saved artifacts)
        raw_input:     Dict with raw block features

    Returns:
        Predicted gas price in Gwei (float, >= 0)
    """
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

def main(csv_path: str = None, tune: bool = False, n_blocks: int = 5000,
          use_web3: bool = False, rpc_url: str = None, compare: bool = False):
    """
    End-to-end Random Forest training pipeline:
      1. Load / simulate data
      2. Feature engineering + chronological split
      3. Train Random Forest
      4. Cross-validation
      5. Evaluate on test set
      6. Feature importance (MDI + Permutation)
      7. Visualize results
      8. (Optional) Compare vs XGBoost
      9. Save model artifacts
    """
    print("\n" + "═"*62)
    print("  GAS FEE PREDICTION — Random Forest Training Pipeline")
    print("═"*62)

    # 1. Data
    df   = load_or_simulate_data(csv_path, n_blocks, use_web3, rpc_url)

    # 2. Preprocess
    data = preprocess(df)

    # 3. Train
    model = train_random_forest(data["X_train"], data["y_train"], tune=tune)

    # 4. Cross-validation
    cv_results = cross_validate_rf(model, data["X_train"], data["y_train"])

    # 5. Evaluate
    results = evaluate_model(model, data["X_test"], data["y_test"])

    # 6. Feature importance
    importance_df = compute_feature_importance(
        model, data["X_test"], data["y_test"], data["feature_names"]
    )

    # 7. Visualize
    plot_results(
        data["y_test"], results["y_pred"],
        importance_df, cv_results, results["metrics"],
        save_path="rf_gas_fee_results.png",
    )

    # 8. (Optional) Compare vs XGBoost
    if compare:
        compare_with_xgboost(results["metrics"], data,
                              save_path="model_comparison.png")

    # 9. Save
    save_model(model, data["feature_names"])

    print("\n[DONE] Random Forest pipeline complete!")
    return model, data["feature_names"], results["metrics"]


# ═══════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Gas Fee Prediction — Random Forest Pipeline"
    )
    parser.add_argument("--csv",     type=str,  default=None,  help="Path to CSV dataset")
    parser.add_argument("--web3",    action="store_true",       help="Fetch real data via Web3.py")
    parser.add_argument("--rpc",     type=str,  default=None,  help="RPC URL (Infura/Alchemy)")
    parser.add_argument("--blocks",  type=int,  default=5000,  help="Blocks to fetch/simulate")
    parser.add_argument("--tune",    action="store_true",       help="Run hyperparameter search")
    parser.add_argument("--compare", action="store_true",       help="Compare RF vs XGBoost")
    args = parser.parse_args()

    main(
        csv_path = args.csv,
        tune     = args.tune,
        n_blocks = args.blocks,
        use_web3 = args.web3,
        rpc_url  = args.rpc,
        compare  = args.compare,
    )