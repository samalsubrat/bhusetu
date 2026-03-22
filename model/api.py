"""
=============================================================================
  GAS FEE PREDICTION — FastAPI Deployment Server
=============================================================================
Run locally:
    pip install fastapi uvicorn
    uvicorn api:app --reload --host 0.0.0.0 --port 8000

Endpoints:
    POST /predict       → Predict gas fee from block features
    GET  /health        → Health check
    GET  /model/info    → Model metadata
    POST /predict/batch → Batch predictions

Test with curl:
    curl -X POST http://localhost:8000/predict \
      -H "Content-Type: application/json" \
      -d '{
        "gas_used": 15000000,
        "gas_limit": 30000000,
        "base_fee": 30000000000,
        "transaction_count": 150,
        "mempool_size": 800,
        "priority_fee": 2000000000,
        "timestamp": "2024-06-15T14:30:00"
      }'
=============================================================================
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
import numpy as np
import time
import os

# Local import
from gas_fee_model import load_model, predict_gas_fee

# ── App Initialization
app = FastAPI(
    title="Gas Fee Prediction API",
    description="XGBoost-based Ethereum gas fee predictor. Submit block metrics → get predicted gas price in Gwei.",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at /docs
    redoc_url="/redoc",     # ReDoc at /redoc
)

# ── CORS (allow all for development — restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global model cache (loaded once at startup)
_model = None
_feature_names = None
_model_loaded_at = None


def get_model():
    """Lazy-loads the model on first request (or reloads if requested)."""
    global _model, _feature_names, _model_loaded_at
    if _model is None:
        try:
            _model, _feature_names = load_model()
            _model_loaded_at = datetime.utcnow().isoformat()
        except FileNotFoundError:
            raise HTTPException(
                status_code=503,
                detail="Model not found. Run `python gas_fee_model.py` to train and save the model first."
            )
    return _model, _feature_names


# ─────────────────────────────────────────────
#  SCHEMAS (Pydantic v2)
# ─────────────────────────────────────────────

class BlockFeatures(BaseModel):
    """
    Input features for a single gas fee prediction.
    All fields match the blockchain data schema.
    """
    gas_used:          float = Field(...,  description="Gas used in the block (wei)", example=15_000_000)
    gas_limit:         float = Field(...,  description="Gas limit of the block",       example=30_000_000)
    transaction_count: int   = Field(...,  description="Number of transactions",        example=150)
    base_fee:          float = Field(30e9, description="EIP-1559 base fee (wei)",       example=30_000_000_000)
    priority_fee:      Optional[float] = Field(2e9,  description="Priority tip (wei)",  example=2_000_000_000)
    mempool_size:      Optional[int]   = Field(500,  description="Pending tx count",    example=800)
    timestamp:         Optional[str]   = Field(None, description="ISO timestamp",       example="2024-06-15T14:30:00")

    # Lag features (optional — filled with 0 if not provided)
    gas_price_lag_1: Optional[float] = Field(None, description="Gas price 1 block ago (Gwei)")
    gas_price_lag_5: Optional[float] = Field(None, description="Gas price 5 blocks ago (Gwei)")
    base_fee_roll_15: Optional[float] = Field(None, description="15-block rolling avg base fee")

    @validator("gas_limit")
    def gas_limit_positive(cls, v):
        if v <= 0:
            raise ValueError("gas_limit must be positive")
        return v

    @validator("transaction_count")
    def tx_count_range(cls, v):
        if v < 0 or v > 1000:
            raise ValueError("transaction_count must be between 0 and 1000")
        return v


class PredictionResponse(BaseModel):
    """API response schema."""
    predicted_gas_fee_gwei: float  = Field(..., description="Predicted gas price in Gwei")
    predicted_gas_fee_wei:  float  = Field(..., description="Predicted gas price in Wei")
    predicted_gas_fee_usd:  Optional[float] = Field(None, description="Approximate USD cost (if ETH price provided)")
    confidence_band:        dict   = Field(..., description="±1 std approximate range")
    inference_time_ms:      float  = Field(..., description="Inference latency in milliseconds")
    model_version:          str    = Field(..., description="Model artifact version")
    timestamp:              str    = Field(..., description="Prediction timestamp (UTC)")


class BatchRequest(BaseModel):
    """Batch inference request."""
    blocks: List[BlockFeatures] = Field(..., description="List of block feature sets")
    eth_price_usd: Optional[float] = Field(None, description="ETH price for USD conversion")


class HealthResponse(BaseModel):
    status:       str
    model_loaded: bool
    loaded_at:    Optional[str]
    uptime_s:     float


# ─────────────────────────────────────────────
#  STARTUP
# ─────────────────────────────────────────────

_startup_time = time.time()


@app.on_event("startup")
async def startup_event():
    """Pre-warm the model cache at startup."""
    print("[API] Starting Gas Fee Prediction API...")
    try:
        get_model()
        print("[API] Model loaded successfully.")
    except Exception as e:
        print(f"[API] Warning: Could not pre-load model: {e}")


# ─────────────────────────────────────────────
#  ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check():
    """
    Health check endpoint.
    Returns model load status and API uptime.
    """
    return HealthResponse(
        status="healthy",
        model_loaded=_model is not None,
        loaded_at=_model_loaded_at,
        uptime_s=round(time.time() - _startup_time, 2),
    )


@app.get("/model/info", tags=["System"])
def model_info():
    """
    Returns model metadata: feature count, training info, etc.
    """
    model, feature_names = get_model()
    return {
        "model_type":     "XGBRegressor",
        "n_features":     len(feature_names),
        "feature_names":  feature_names,
        "best_iteration": getattr(model, "best_iteration", "N/A"),
        "loaded_at":      _model_loaded_at,
        "target":         "gas_price_gwei",
        "output_unit":    "Gwei",
    }


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(features: BlockFeatures, eth_price_usd: Optional[float] = None):
    """
    Predict gas fee for a single block.

    **Input**: Block-level features (gas_used, gas_limit, base_fee, etc.)

    **Output**: Predicted gas price in Gwei + USD estimate (if ETH price given)

    **Example**:
    ```json
    {
      "gas_used": 15000000,
      "gas_limit": 30000000,
      "base_fee": 30000000000,
      "transaction_count": 150,
      "mempool_size": 800
    }
    ```
    """
    model, feature_names = get_model()

    raw_input = features.dict()

    t0 = time.perf_counter()
    try:
        predicted_gwei = predict_gas_fee(model, feature_names, raw_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    inference_ms = (time.perf_counter() - t0) * 1000

    predicted_wei = predicted_gwei * 1e9

    # Rough confidence band (±15% based on typical model MAPE)
    confidence_band = {
        "lower_gwei": round(predicted_gwei * 0.85, 4),
        "upper_gwei": round(predicted_gwei * 1.15, 4),
    }

    # USD cost for a standard ETH transfer (21,000 gas)
    usd_cost = None
    if eth_price_usd:
        usd_cost = round((predicted_gwei * 21_000 * 1e-9) * eth_price_usd, 4)

    return PredictionResponse(
        predicted_gas_fee_gwei=round(predicted_gwei, 4),
        predicted_gas_fee_wei=predicted_wei,
        predicted_gas_fee_usd=usd_cost,
        confidence_band=confidence_band,
        inference_time_ms=round(inference_ms, 3),
        model_version="xgb_v1.0",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


@app.post("/predict/batch", tags=["Prediction"])
def predict_batch(batch: BatchRequest):
    """
    Batch inference for multiple blocks.

    Useful for:
    - Backtesting strategies
    - Analyzing gas fee trends over a range of blocks
    - Building dashboards

    Returns list of predictions in the same order as input.
    """
    model, feature_names = get_model()

    predictions = []
    t0 = time.perf_counter()

    for block in batch.blocks:
        raw_input = block.dict()
        try:
            gwei = predict_gas_fee(model, feature_names, raw_input)
        except Exception:
            gwei = -1.0  # Flag failed predictions

        usd_cost = None
        if batch.eth_price_usd and gwei > 0:
            usd_cost = round((gwei * 21_000 * 1e-9) * batch.eth_price_usd, 6)

        predictions.append({
            "predicted_gas_fee_gwei": round(gwei, 4),
            "predicted_gas_fee_usd":  usd_cost,
        })

    total_ms = (time.perf_counter() - t0) * 1000

    return {
        "count":          len(predictions),
        "predictions":    predictions,
        "total_time_ms":  round(total_ms, 2),
        "avg_time_ms":    round(total_ms / len(predictions), 3) if predictions else 0,
    }


@app.post("/model/reload", tags=["System"])
def reload_model():
    """
    Hot-reloads the model from disk without restarting the API.
    Use after retraining to serve the latest version.
    """
    global _model, _feature_names, _model_loaded_at
    _model = None
    _feature_names = None
    get_model()
    return {"status": "reloaded", "loaded_at": _model_loaded_at}