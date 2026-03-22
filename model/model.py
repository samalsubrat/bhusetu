"""
=============================================================================
  GAS FEE PREDICTION MODEL — XGBoost-based Blockchain Analytics Engine
=============================================================================
Author: ML Engineering Team
Description:
    Predicts Ethereum gas fees using XGBoost regression on historical
    blockchain data. Supports simulation, real data ingestion, feature
    engineering, hyperparameter tuning, and model serialization.

Why XGBoost?
  - Handles non-linear relationships between block metrics and gas prices
  - Robust to missing values (common in blockchain data)
  - Built-in feature importance — great for interpretability
  - Fast inference — critical for real-time gas fee APIs
  - Regularization (L1/L2) prevents overfitting on noisy mempool data
=============================================================================
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import warnings
import joblib
import os

from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split, RandomizedSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
#  SECTION 1: DATA SIMULATION
# ─────────────────────────────────────────────

def simulate_blockchain_data(n_blocks: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Simulates realistic Ethereum-like blockchain data.

    Gas prices follow patterns:
      - Higher during business hours (9am–5pm UTC)
      - Spikes during high network congestion
      - Base fee adjusts block-by-block (EIP-1559 mechanism)
      - Weekend dips, weekday peaks

    Args:
        n_blocks: Number of blocks to simulate
        seed: Random seed for reproducibility

    Returns:
        pd.DataFrame with all blockchain features
    """
    np.random.seed(seed)

    # Simulate timestamps starting from ~1 year ago
    start_time = datetime(2024, 3, 1)
    # Ethereum produces ~12-second blocks
    timestamps = [start_time + timedelta(seconds=12 * i) for i in range(n_blocks)]

    block_numbers = np.arange(19_000_000, 19_000_000 + n_blocks)

    # ── Gas Limit (relatively stable, ~30M per block post-merge)
    gas_limit = np.random.normal(30_000_000, 500_000, n_blocks).clip(15_000_000, 36_000_000)

    # ── Transaction Count (10–300 per block)
    hour_of_day = np.array([t.hour for t in timestamps])
    tx_base = 150 + 80 * np.sin((hour_of_day - 9) * np.pi / 12)  # peak at ~3pm UTC
    transaction_count = np.random.normal(tx_base, 30, n_blocks).clip(10, 300).astype(int)

    # ── Gas Used (proportional to tx count, with noise)
    gas_used_ratio = (transaction_count / 300) * np.random.normal(0.85, 0.1, n_blocks)
    gas_used_ratio = gas_used_ratio.clip(0.1, 1.0)
    gas_used = (gas_used_ratio * gas_limit).astype(int)

    # ── Base Fee (EIP-1559): adjusts ±12.5% based on congestion
    # Target: 50% block utilization. Above → fee up. Below → fee down.
    base_fee = np.zeros(n_blocks)
    base_fee[0] = 30e9  # Start at 30 Gwei

    for i in range(1, n_blocks):
        utilization = gas_used[i - 1] / gas_limit[i - 1]
        delta = (utilization - 0.5) / 0.5  # normalized deviation from 50%
        base_fee[i] = base_fee[i - 1] * (1 + 0.125 * delta)
        base_fee[i] = np.clip(base_fee[i], 1e9, 500e9)  # 1–500 Gwei range

    # ── Priority Fee (tip): user-driven, correlated with congestion
    mempool_pressure = gas_used / gas_limit
    priority_fee = (np.random.lognormal(1.5, 0.8, n_blocks) * 1e9 * mempool_pressure).clip(1e9, 50e9)

    # ── Mempool Size: builds up during congestion
    mempool_size = (transaction_count * np.random.uniform(2, 8, n_blocks)).astype(int)

    # ── Total Effective Gas Price (target variable) in Gwei
    # Effective price = base_fee + priority_fee (what miners/validators receive)
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
        "gas_price_gwei":    gas_price_gwei,  # TARGET
    })

    # Inject ~3% missing values (realistic for live data pipelines)
    for col in ["mempool_size", "priority_fee"]:
        mask = np.random.rand(n_blocks) < 0.03
        df.loc[mask, col] = np.nan

    return df


def load_or_simulate_data(csv_path: str = None, n_blocks: int = 5000,
                          use_web3: bool = False, rpc_url: str = None) -> pd.DataFrame:
    """
    Loads data from one of three sources (in priority order):
      1. CSV file (if csv_path exists on disk)
      2. Live Ethereum node via Web3.py (if use_web3=True)
      3. Simulation fallback (always works, no dependencies)

    Args:
        csv_path:  Path to existing CSV file
        n_blocks:  Blocks to fetch/simulate if no CSV provided
        use_web3:  If True, fetch real data from Ethereum node
        rpc_url:   Infura/Alchemy RPC URL (or set RPC_URL in .env)

    Returns:
        pd.DataFrame ready for feature engineering
    """
    # ── Source 1: CSV on disk
    if csv_path and os.path.exists(csv_path):
        print(f"[INFO] Loading data from CSV: {csv_path}")
        df = pd.read_csv(csv_path, parse_dates=["timestamp"])
        print(f"[INFO] Loaded {len(df):,} rows")
        return df

    # ── Source 2: Live Web3 data
    if use_web3:
        try:
            from data_collector import get_real_data
            print(f"[INFO] Fetching {n_blocks} real blocks from Ethereum node...")
            df = get_real_data(
                rpc_url    = rpc_url,
                n_blocks   = n_blocks,
                method     = "fee_history",
                output_csv = csv_path or "blockchain_data.csv",
            )
            print(f"[INFO] Collected {len(df):,} real blocks")
            return df
        except ImportError:
            print("[WARN] data_collector.py not found — falling back to simulation")
        except Exception as e:
            print(f"[WARN] Web3 collection failed ({e}) — falling back to simulation")

    # ── Source 3: Simulation fallback
    print("[INFO] Simulating blockchain data...")
    df = simulate_blockchain_data(n_blocks)
    print(f"[INFO] Simulated {len(df):,} blocks")
    return df


# ─────────────────────────────────────────────
#  SECTION 2: FEATURE ENGINEERING
# ─────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw blockchain data into ML-ready features.

    Feature categories:
      1. Temporal: hour, day-of-week, is_weekend (gas prices follow cycles)
      2. Utilization ratios: how full blocks are (core demand signal)
      3. Rolling statistics: smoothed trends over recent N blocks
      4. Lag features: previous block's fee (strong autocorrelation)
      5. EIP-1559 derived: base fee velocity (rate of change)

    Args:
        df: Raw blockchain DataFrame (must be sorted by block_number)

    Returns:
        pd.DataFrame with new feature columns added
    """
    df = df.copy().sort_values("block_number").reset_index(drop=True)

    # ── 1. Temporal Features
    df["hour"]         = df["timestamp"].dt.hour
    df["day_of_week"]  = df["timestamp"].dt.dayofweek   # 0=Mon, 6=Sun
    df["is_weekend"]   = (df["day_of_week"] >= 5).astype(int)
    df["month"]        = df["timestamp"].dt.month
    # Cyclical encoding for hour (captures "23:00 is close to 00:00")
    df["hour_sin"]     = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]     = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]      = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]      = np.cos(2 * np.pi * df["day_of_week"] / 7)

    # ── 2. Utilization Ratios
    df["block_utilization"] = df["gas_used"] / df["gas_limit"]   # 0–1, key demand signal
    df["tx_density"]        = df["transaction_count"] / df["gas_limit"] * 1e6  # txs per million gas

    # ── 3. Rolling Statistics (avoid data leakage: use .shift(1) before rolling)
    for window in [5, 15, 50]:
        df[f"base_fee_roll_{window}"]   = df["base_fee"].shift(1).rolling(window, min_periods=1).mean()
        df[f"utilization_roll_{window}"] = df["block_utilization"].shift(1).rolling(window, min_periods=1).mean()
        df[f"tx_count_roll_{window}"]   = df["transaction_count"].shift(1).rolling(window, min_periods=1).mean()

    # ── 4. Lag Features (previous blocks' gas prices — strongest predictor)
    for lag in [1, 2, 3, 5, 10]:
        df[f"gas_price_lag_{lag}"]  = df["gas_price_gwei"].shift(lag)
        df[f"base_fee_lag_{lag}"]   = df["base_fee"].shift(lag)

    # ── 5. EIP-1559 Dynamics
    df["base_fee_pct_change"] = df["base_fee"].pct_change(1).replace([np.inf, -np.inf], 0)
    df["base_fee_acceleration"] = df["base_fee_pct_change"].diff(1)  # second derivative

    # ── 6. Mempool Pressure (fill NaN with rolling median or default scalar)
    df["mempool_size"] = df["mempool_size"].fillna(df["mempool_size"].rolling(10, min_periods=1).median())
    df["mempool_size"] = df["mempool_size"].fillna(500) # Fallback if 100% missing (e.g. eth_feeHistory)
    
    df["priority_fee"] = df["priority_fee"].fillna(df["priority_fee"].rolling(10, min_periods=1).median())
    df["priority_fee"] = df["priority_fee"].fillna(2e9) # Fallback if entirely missing
    
    df["mempool_pressure"] = df["mempool_size"] / (df["transaction_count"] + 1)

    # ── 7. Priority Fee (convert to Gwei for scale consistency)
    df["priority_fee_gwei"] = df["priority_fee"] / 1e9
    df["base_fee_gwei"]     = df["base_fee"] / 1e9

    return df


def select_features(df: pd.DataFrame) -> tuple:
    """
    Separates features (X) from target (y) and drops non-ML columns.

    Returns:
        X: Feature DataFrame
        y: Target Series (gas_price_gwei)
        feature_names: List of feature column names
    """
    # Columns to drop (identifiers, raw timestamp, and target)
    drop_cols = ["block_number", "timestamp", "gas_price_gwei",
                 "base_fee", "priority_fee",  # replaced by _gwei versions
                 "hour", "day_of_week", "month"]  # replaced by sin/cos

    feature_cols = [c for c in df.columns if c not in drop_cols]

    X = df[feature_cols].copy()
    y = df["gas_price_gwei"].copy()

    return X, y, feature_cols


# ─────────────────────────────────────────────
#  SECTION 3: DATA PREPROCESSING
# ─────────────────────────────────────────────

def preprocess(df: pd.DataFrame, test_size: float = 0.2) -> dict:
    """
    Full preprocessing pipeline:
      1. Feature engineering
      2. Drop NaN rows (from lag/rolling at start of series)
      3. Chronological train/test split (NO random shuffle — prevents leakage!)
      4. Return splits + feature names

    IMPORTANT: For time-series data, NEVER use random train/test split.
    We use the last `test_size` fraction as the test set (future blocks).

    Args:
        df: Raw blockchain DataFrame
        test_size: Fraction of data for testing

    Returns:
        dict with X_train, X_test, y_train, y_test, feature_names
    """
    print("[PREPROCESS] Engineering features...")
    df_feat = engineer_features(df)

    # Drop rows with NaN (from lag/rolling windows at the beginning)
    df_feat = df_feat.dropna().reset_index(drop=True)
    print(f"[PREPROCESS] Rows after dropping NaN: {len(df_feat):,}")

    X, y, feature_names = select_features(df_feat)

    # Chronological split — preserve temporal order!
    split_idx = int(len(X) * (1 - test_size))
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    print(f"[PREPROCESS] Train: {len(X_train):,} | Test: {len(X_test):,}")
    print(f"[PREPROCESS] Features: {len(feature_names)}")

    return {
        "X_train": X_train, "X_test": X_test,
        "y_train": y_train, "y_test": y_test,
        "feature_names": feature_names,
        "df_feat": df_feat,
    }


# ─────────────────────────────────────────────
#  SECTION 4: MODEL TRAINING
# ─────────────────────────────────────────────

def tune_hyperparameters(X_train: pd.DataFrame, y_train: pd.Series,
                          n_iter: int = 30, cv_folds: int = 5) -> dict:
    """
    RandomizedSearchCV with TimeSeriesSplit cross-validation.

    TimeSeriesSplit is used instead of KFold because:
      - Each fold's training data is ALWAYS before the validation data
      - This mirrors real-world deployment conditions
      - Prevents future data leaking into past predictions

    Args:
        X_train, y_train: Training data
        n_iter: Number of hyperparameter combinations to try
        cv_folds: Number of CV folds

    Returns:
        best_params dict
    """
    print(f"\n[TUNE] Starting RandomizedSearchCV ({n_iter} iterations, {cv_folds}-fold TimeSeriesCV)...")

    param_dist = {
        "n_estimators":      [100, 200, 300, 500],
        "max_depth":         [3, 4, 5, 6, 7],
        "learning_rate":     [0.01, 0.05, 0.1, 0.2],
        "subsample":         [0.6, 0.7, 0.8, 0.9, 1.0],
        "colsample_bytree":  [0.6, 0.7, 0.8, 0.9, 1.0],
        "min_child_weight":  [1, 3, 5, 7],
        "reg_alpha":         [0, 0.01, 0.1, 1.0],    # L1 regularization
        "reg_lambda":        [0.5, 1.0, 2.0, 5.0],   # L2 regularization
        "gamma":             [0, 0.1, 0.3, 0.5],      # Min split loss
    }

    tscv = TimeSeriesSplit(n_splits=cv_folds)

    base_model = XGBRegressor(
        objective="reg:squarederror",
        tree_method="hist",   # Fast histogram-based method
        random_state=42,
        n_jobs=-1,
    )

    search = RandomizedSearchCV(
        estimator=base_model,
        param_distributions=param_dist,
        n_iter=n_iter,
        scoring="neg_root_mean_squared_error",
        cv=tscv,
        verbose=1,
        random_state=42,
        n_jobs=-1,
    )

    search.fit(X_train, y_train)

    print(f"[TUNE] Best CV RMSE: {-search.best_score_:.4f} Gwei")
    print(f"[TUNE] Best params: {search.best_params_}")

    return search.best_params_


def train_model(X_train: pd.DataFrame, y_train: pd.Series,
                params: dict = None, tune: bool = False) -> XGBRegressor:
    """
    Trains the XGBoost model with optional hyperparameter tuning.

    Overfitting Prevention Strategies:
      - Early stopping on a validation set (stops when CV loss plateaus)
      - L1/L2 regularization (reg_alpha, reg_lambda)
      - Subsampling (subsample < 1.0 → stochastic boosting)
      - Column subsampling (colsample_bytree)
      - Max depth limit (prevents deep trees from memorizing noise)

    Args:
        X_train, y_train: Training data
        params: Pre-defined hyperparameters (skips tuning if provided)
        tune: Whether to run hyperparameter search

    Returns:
        Trained XGBRegressor
    """
    if tune and params is None:
        params = tune_hyperparameters(X_train, y_train)

    # Sensible defaults (production-tested for gas fee prediction)
    default_params = {
        "n_estimators":     300,
        "max_depth":        5,
        "learning_rate":    0.05,
        "subsample":        0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 3,
        "reg_alpha":        0.1,
        "reg_lambda":       1.0,
        "gamma":            0.1,
        "objective":        "reg:squarederror",
        "tree_method":      "hist",
        "random_state":     42,
        "n_jobs":           -1,
    }

    if params:
        default_params.update(params)

    print("\n[TRAIN] Fitting XGBoost model...")
    model = XGBRegressor(**default_params)

    # Internal validation split for early stopping (last 10% of training data)
    val_split = int(len(X_train) * 0.9)
    X_tr, X_val = X_train.iloc[:val_split], X_train.iloc[val_split:]
    y_tr, y_val = y_train.iloc[:val_split], y_train.iloc[val_split:]

    model.set_params(n_estimators=1000, early_stopping_rounds=30)
    model.fit(
        X_tr, y_tr,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    print(f"[TRAIN] Best iteration: {model.best_iteration}")
    print(f"[TRAIN] Trees used: {model.best_iteration + 1}")

    return model


# ─────────────────────────────────────────────
#  SECTION 5: EVALUATION
# ─────────────────────────────────────────────

def evaluate_model(model: XGBRegressor, X_test: pd.DataFrame,
                   y_test: pd.Series) -> dict:
    """
    Computes regression metrics on the hold-out test set.

    Metrics Explained:
      - RMSE: Penalizes large errors heavily (gas fee spikes matter!)
      - MAE:  Average absolute error in Gwei (intuitive)
      - R²:   Variance explained (1.0 = perfect, 0 = predicts mean only)
      - MAPE: Mean Absolute Percentage Error (scale-independent)

    Args:
        model: Trained XGBRegressor
        X_test, y_test: Test data

    Returns:
        dict of metric values + predictions
    """
    y_pred = model.predict(X_test)
    y_pred = np.clip(y_pred, 0, None)  # Gas prices can't be negative

    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100

    metrics = {"RMSE": rmse, "MAE": mae, "R2": r2, "MAPE": mape}

    print("\n" + "="*50)
    print("  MODEL EVALUATION RESULTS")
    print("="*50)
    print(f"  RMSE : {rmse:.4f} Gwei")
    print(f"  MAE  : {mae:.4f} Gwei")
    print(f"  R²   : {r2:.4f}")
    print(f"  MAPE : {mape:.2f}%")
    print("="*50)

    return {"metrics": metrics, "y_pred": y_pred}


# ─────────────────────────────────────────────
#  SECTION 6: VISUALIZATION
# ─────────────────────────────────────────────

def plot_results(y_test: pd.Series, y_pred: np.ndarray,
                 model: XGBRegressor, feature_names: list,
                 save_path: str = "gas_fee_results.png"):
    """
    Creates a 4-panel diagnostic plot:
      1. Actual vs Predicted gas fees (time series)
      2. Scatter: Actual vs Predicted (residual pattern)
      3. Feature Importance (top 20)
      4. Residual distribution

    Args:
        y_test: True gas prices
        y_pred: Predicted gas prices
        model: Trained XGBRegressor (for feature importances)
        feature_names: List of feature names
        save_path: Where to save the figure
    """
    fig = plt.figure(figsize=(18, 14), facecolor="#c2c2c2")
    fig.suptitle("Gas Fee Prediction Model — Diagnostic Report",
                 fontsize=18, color="white", fontweight="bold", y=0.98)

    gs = gridspec.GridSpec(2, 2, figure=fig, hspace=0.4, wspace=0.35)

    ax1 = fig.add_subplot(gs[0, :])  # Full-width top
    ax2 = fig.add_subplot(gs[1, 0])
    ax3 = fig.add_subplot(gs[1, 1])

    style = {
    "axes.facecolor":   "#ffffff",   # white background
    "axes.edgecolor":   "#d0d0d0",   # light gray borders
    "axes.labelcolor":  "#333333",   # dark text for labels
    "xtick.color":      "#555555",   # medium gray ticks
    "ytick.color":      "#555555",
    "grid.color":       "#e6e6e6",   # very light grid lines
    "grid.linestyle":   "--",
    "grid.alpha":       0.7,
    "text.color":       "#222222",   # near-black text
    }
    plt.rcParams.update(style)

    # ── Plot 1: Time Series Comparison
    idx = range(len(y_test))
    ax1.plot(idx, y_test.values, color="#4fc3f7", linewidth=0.8, alpha=0.9, label="Actual")
    ax1.plot(idx, y_pred,        color="#ff7043", linewidth=0.8, alpha=0.9, label="Predicted", linestyle="--")
    ax1.set_title("Actual vs Predicted Gas Fees (Test Set)", color="white", pad=10)
    ax1.set_xlabel("Block Index (chronological)")
    ax1.set_ylabel("Gas Price (Gwei)")
    ax1.legend(loc="upper right", framealpha=0.3)
    ax1.grid(True)

    # ── Plot 2: Scatter Plot
    ax2.scatter(y_test, y_pred, alpha=0.2, s=8, color="#7c4dff")
    max_val = max(y_test.max(), y_pred.max())
    ax2.plot([0, max_val], [0, max_val], "r--", linewidth=1.5, label="Perfect Prediction")
    ax2.set_title("Actual vs Predicted (Scatter)", color="white")
    ax2.set_xlabel("Actual Gas Price (Gwei)")
    ax2.set_ylabel("Predicted Gas Price (Gwei)")
    ax2.legend(framealpha=0.3)
    ax2.grid(True)

    # ── Plot 3: Feature Importance
    importance = model.feature_importances_
    feat_df = pd.DataFrame({"feature": feature_names, "importance": importance})
    feat_df = feat_df.nlargest(15, "importance")

    colors = plt.cm.plasma(np.linspace(0.3, 0.9, len(feat_df)))
    bars = ax3.barh(feat_df["feature"], feat_df["importance"], color=colors)
    ax3.set_title("Top 15 Feature Importances", color="white")
    ax3.set_xlabel("Importance Score")
    ax3.invert_yaxis()
    ax3.grid(True, axis="x")

    plt.savefig(save_path, dpi=150, bbox_inches="tight", facecolor="#0f1117")
    print(f"\n[PLOT] Saved diagnostic plot to: {save_path}")
    plt.close()


# ─────────────────────────────────────────────
#  SECTION 7: MODEL SERIALIZATION
# ─────────────────────────────────────────────

def save_model(model: XGBRegressor, feature_names: list,
               model_dir: str = "model_artifacts"):
    """
    Saves the trained model and feature schema to disk.

    Args:
        model: Trained XGBRegressor
        feature_names: List of feature names (required for inference)
        model_dir: Directory to save artifacts
    """
    os.makedirs(model_dir, exist_ok=True)
    model_path   = os.path.join(model_dir, "xgb_gas_fee_model.joblib")
    feature_path = os.path.join(model_dir, "feature_names.joblib")

    joblib.dump(model, model_path)
    joblib.dump(feature_names, feature_path)

    print(f"[SAVE] Model saved  → {model_path}")
    print(f"[SAVE] Features saved → {feature_path}")


def load_model(model_dir: str = "model_artifacts") -> tuple:
    """
    Loads the trained model and feature schema from disk.

    Returns:
        (model, feature_names)
    """
    model_path   = os.path.join(model_dir, "xgb_gas_fee_model.joblib")
    feature_path = os.path.join(model_dir, "feature_names.joblib")

    model         = joblib.load(model_path)
    feature_names = joblib.load(feature_path)

    print(f"[LOAD] Model loaded from: {model_path}")
    return model, feature_names


# ─────────────────────────────────────────────
#  SECTION 8: INFERENCE HELPER
# ─────────────────────────────────────────────

def predict_gas_fee(model: XGBRegressor, feature_names: list,
                    raw_input: dict) -> float:
    """
    Single-sample inference with feature engineering.
    Used by the FastAPI endpoint.

    Args:
        model: Loaded XGBRegressor
        feature_names: Expected feature columns
        raw_input: Dict with raw blockchain features

    Returns:
        Predicted gas price in Gwei
    """
    df = pd.DataFrame([raw_input])

    # Parse timestamp
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    else:
        df["timestamp"] = pd.Timestamp.utcnow()

    # Quick feature engineering for single-row inference
    df["hour"]         = df["timestamp"].dt.hour
    df["day_of_week"]  = df["timestamp"].dt.dayofweek
    df["is_weekend"]   = (df["day_of_week"] >= 5).astype(int)
    df["month"]        = df["timestamp"].dt.month
    df["hour_sin"]     = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]     = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]      = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]      = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["block_utilization"] = df["gas_used"] / df["gas_limit"]
    df["tx_density"]        = df["transaction_count"] / df["gas_limit"] * 1e6
    df["base_fee_gwei"]     = df.get("base_fee", pd.Series([30e9])) / 1e9
    df["priority_fee_gwei"] = df.get("priority_fee", pd.Series([2e9])) / 1e9
    df["mempool_pressure"]  = df.get("mempool_size", pd.Series([500])) / (df["transaction_count"] + 1)

    # Fill missing lag/rolling features with sensible defaults
    for feat in feature_names:
        if feat not in df.columns:
            df[feat] = 0.0

    X = df[feature_names].fillna(0)
    prediction = float(model.predict(X)[0])
    return max(0.0, prediction)


# ─────────────────────────────────────────────
#  MAIN PIPELINE
# ─────────────────────────────────────────────

def main(csv_path: str = None, tune: bool = False, n_blocks: int = 5000,
         use_web3: bool = False, rpc_url: str = None):
    """
    End-to-end training pipeline:
      1. Load / simulate data
      2. Preprocess & feature engineer
      3. Train XGBoost model
      4. Evaluate
      5. Plot results
      6. Save artifacts

    Args:
        csv_path: Optional path to real CSV data
        tune: Whether to run hyperparameter search
        n_blocks: Number of blocks to simulate if no CSV
    """
    print("\n" + "="*60)
    print("  GAS FEE PREDICTION — XGBoost Training Pipeline")
    print("="*60)

    # Step 1: Data
    df = load_or_simulate_data(csv_path, n_blocks, use_web3=use_web3, rpc_url=rpc_url)

    # Step 2: Preprocess
    data = preprocess(df)

    # Step 3: Train
    model = train_model(
        data["X_train"], data["y_train"],
        tune=tune
    )

    # Step 4: Evaluate
    results = evaluate_model(model, data["X_test"], data["y_test"])

    # Step 5: Visualize
    plot_results(
        data["y_test"], results["y_pred"],
        model, data["feature_names"],
        save_path="gas_fee_results.png"
    )

    # Step 6: Save
    save_model(model, data["feature_names"])

    print("\n[DONE] Pipeline complete!")
    return model, data["feature_names"], results["metrics"]


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Gas Fee Prediction — XGBoost Pipeline")
    parser.add_argument("--csv",      type=str,  default=None,  help="Path to CSV dataset")
    parser.add_argument("--web3",     action="store_true",      help="Fetch real data via Web3.py")
    parser.add_argument("--rpc",      type=str,  default=None,  help="RPC URL (Infura/Alchemy)")
    parser.add_argument("--blocks",   type=int,  default=5000,  help="Blocks to fetch/simulate")
    parser.add_argument("--tune",     action="store_true",      help="Run hyperparameter search")
    args = parser.parse_args()

    main(
        csv_path  = args.csv,
        tune      = args.tune,
        n_blocks  = args.blocks,
        use_web3  = args.web3,
        rpc_url   = args.rpc,
    )