"""
=============================================================================
  REAL BLOCKCHAIN DATA CONNECTOR
=============================================================================
Connects to live Ethereum data via:
  1. Web3.py (direct node RPC — Infura/Alchemy/local)
  2. Etherscan API (historical data, no node needed)
  3. Alchemy Enhanced API (richest data, mempool access)

Setup:
    pip install web3 requests python-dotenv

Environment variables (.env):
    INFURA_URL=https://mainnet.infura.io/v3/YOUR_KEY
    ETHERSCAN_API_KEY=YOUR_KEY
    ALCHEMY_API_KEY=YOUR_KEY
=============================================================================
"""

import os
import time
import requests
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Optional, List, Dict
from dotenv import load_dotenv

load_dotenv()


# ─────────────────────────────────────────────
#  1. WEB3.PY CONNECTOR (Direct Node Access)
# ─────────────────────────────────────────────

class Web3BlockchainConnector:
    """
    Fetches live block data directly from an Ethereum node via RPC.

    Best for:
    - Real-time data with no rate limits (your own node)
    - Access to pending transaction pool (mempool)
    - Full control over data freshness

    Requires: Infura/Alchemy/local Geth or Erigon node
    """

    def __init__(self, rpc_url: str = None):
        """
        Args:
            rpc_url: Ethereum RPC endpoint (e.g., Infura URL)
        """
        try:
            from web3 import Web3
            self.w3 = Web3(Web3.HTTPProvider(rpc_url or os.getenv("INFURA_URL")))
            if not self.w3.is_connected():
                raise ConnectionError("Cannot connect to Ethereum node")
            print(f"[Web3] Connected. Latest block: {self.w3.eth.block_number:,}")
        except ImportError:
            raise ImportError("Run: pip install web3")

    def get_block_data(self, block_number: int) -> dict:
        """
        Fetches a single block's data and computes gas metrics.

        Args:
            block_number: Block number (or "latest" / "pending")

        Returns:
            dict with all features needed for the ML model
        """
        block = self.w3.eth.get_block(block_number, full_transactions=True)

        # EIP-1559 base fee (available post-London fork, block 12965000)
        base_fee = block.get("baseFeePerGas", 0)

        # Priority fees from actual transactions
        priority_fees = []
        for tx in block.transactions:
            if hasattr(tx, "maxPriorityFeePerGas") and tx.maxPriorityFeePerGas:
                # EIP-1559 tx: priority fee = min(maxPriority, maxFee - baseFee)
                effective_tip = min(tx.maxPriorityFeePerGas, tx.maxFeePerGas - base_fee)
                priority_fees.append(max(0, effective_tip))
            elif hasattr(tx, "gasPrice") and tx.gasPrice:
                # Legacy tx
                priority_fees.append(max(0, tx.gasPrice - base_fee))

        avg_priority = np.mean(priority_fees) if priority_fees else 0

        # Mempool size (pending transactions)
        try:
            mempool = self.w3.eth.get_block("pending")
            mempool_size = len(mempool.transactions)
        except Exception:
            mempool_size = None

        return {
            "block_number":      block.number,
            "timestamp":         datetime.utcfromtimestamp(block.timestamp),
            "gas_used":          block.gasUsed,
            "gas_limit":         block.gasLimit,
            "base_fee":          base_fee,
            "transaction_count": len(block.transactions),
            "mempool_size":      mempool_size,
            "priority_fee":      avg_priority,
            # Target: effective gas price in Gwei
            "gas_price_gwei":    (base_fee + avg_priority) / 1e9,
        }

    def collect_recent_blocks(self, n_blocks: int = 100) -> pd.DataFrame:
        """
        Collects the last N blocks for batch prediction or retraining.

        Args:
            n_blocks: How many recent blocks to fetch

        Returns:
            pd.DataFrame ready for feature engineering
        """
        latest = self.w3.eth.block_number
        records = []

        print(f"[Web3] Fetching blocks {latest - n_blocks} → {latest}...")
        for bn in range(latest - n_blocks, latest + 1):
            try:
                data = self.get_block_data(bn)
                records.append(data)
                time.sleep(0.1)  # Rate limit: 10 req/s
            except Exception as e:
                print(f"[Web3] Block {bn} failed: {e}")

        df = pd.DataFrame(records)
        print(f"[Web3] Collected {len(df)} blocks")
        return df

    def stream_blocks(self, callback, poll_interval: float = 12.0):
        """
        Streams new blocks as they are mined (~every 12 seconds post-merge).

        Args:
            callback: Function called with block data dict on each new block
            poll_interval: Seconds between polls

        Usage:
            def on_new_block(data):
                predicted = model.predict([features])
                print(f"Block {data['block_number']}: Predicted {predicted:.2f} Gwei")

            connector.stream_blocks(on_new_block)
        """
        print("[Web3] Streaming new blocks (Ctrl+C to stop)...")
        last_block = self.w3.eth.block_number

        while True:
            try:
                current = self.w3.eth.block_number
                if current > last_block:
                    for bn in range(last_block + 1, current + 1):
                        data = self.get_block_data(bn)
                        callback(data)
                    last_block = current
            except Exception as e:
                print(f"[Stream] Error: {e}")
            time.sleep(poll_interval)


# ─────────────────────────────────────────────
#  2. ETHERSCAN API CONNECTOR (No Node Needed)
# ─────────────────────────────────────────────

class EtherscanConnector:
    """
    Fetches historical blockchain data via Etherscan API.

    Best for:
    - Historical data collection (backtesting, retraining)
    - No node required — just an API key
    - Free tier: 5 req/s, 100k req/day

    Get API key: https://etherscan.io/apis
    """

    BASE_URL = "https://api.etherscan.io/api"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("ETHERSCAN_API_KEY")
        if not self.api_key:
            raise ValueError("Set ETHERSCAN_API_KEY in .env or pass api_key=")

    def _get(self, params: dict) -> dict:
        params["apikey"] = self.api_key
        resp = requests.get(self.BASE_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "1":
            raise ValueError(f"Etherscan error: {data.get('message')}")
        return data["result"]

    def get_gas_oracle(self) -> dict:
        """
        Returns current gas price recommendation (safe, propose, fast).
        Useful for real-time prediction baseline comparison.

        Returns:
            {"SafeGasPrice": "30", "ProposeGasPrice": "35", "FastGasPrice": "45"}
        """
        return self._get({"module": "gastracker", "action": "gasoracle"})

    def get_historical_gas_prices(self, start_block: int, end_block: int,
                                  offset: int = 1000) -> pd.DataFrame:
        """
        Fetches transaction-level gas prices for a block range.
        Aggregates by block to get block-level statistics.

        Args:
            start_block: First block number
            end_block:   Last block number
            offset:      Max transactions per API call

        Returns:
            pd.DataFrame aggregated by block
        """
        print(f"[Etherscan] Fetching blocks {start_block:,} → {end_block:,}...")
        all_txs = []
        page = 1

        while True:
            try:
                txs = self._get({
                    "module":     "account",
                    "action":     "txlist",
                    "startblock": start_block,
                    "endblock":   end_block,
                    "page":       page,
                    "offset":     offset,
                    "sort":       "asc",
                })
                if not txs:
                    break
                all_txs.extend(txs)
                page += 1
                time.sleep(0.25)  # Respect rate limits
            except Exception:
                break

        if not all_txs:
            print("[Etherscan] No transactions found")
            return pd.DataFrame()

        df = pd.DataFrame(all_txs)
        df["blockNumber"]  = df["blockNumber"].astype(int)
        df["timeStamp"]    = pd.to_datetime(df["timeStamp"].astype(int), unit="s")
        df["gasPrice"]     = df["gasPrice"].astype(float) / 1e9  # Convert to Gwei
        df["gasUsed"]      = df["gasUsed"].astype(float)

        # Aggregate by block
        block_df = df.groupby("blockNumber").agg(
            timestamp         = ("timeStamp", "first"),
            transaction_count = ("hash", "count"),
            avg_gas_price     = ("gasPrice", "mean"),
            gas_used          = ("gasUsed", "sum"),
        ).reset_index()
        block_df.rename(columns={"blockNumber": "block_number"}, inplace=True)

        print(f"[Etherscan] Got {len(block_df)} blocks with {len(df):,} transactions")
        return block_df


# ─────────────────────────────────────────────
#  3. ALCHEMY ENHANCED API (Richest Data)
# ─────────────────────────────────────────────

class AlchemyConnector:
    """
    Fetches rich block data via Alchemy's Enhanced APIs.

    Best for:
    - Mempool/pending transaction data
    - NFT gas spikes and DEX activity
    - Real-time gas price recommendations
    - Webhook-based new block notifications

    Get API key: https://dashboard.alchemy.com
    """

    def __init__(self, api_key: str = None, network: str = "eth-mainnet"):
        self.api_key = api_key or os.getenv("ALCHEMY_API_KEY")
        self.base_url = f"https://{network}.g.alchemy.com/v2/{self.api_key}"

    def _rpc(self, method: str, params: list) -> dict:
        """Generic Ethereum JSON-RPC call via Alchemy."""
        resp = requests.post(self.base_url, json={
            "jsonrpc": "2.0",
            "method":  method,
            "params":  params,
            "id":      1,
        }, timeout=10)
        resp.raise_for_status()
        result = resp.json()
        if "error" in result:
            raise ValueError(result["error"])
        return result["result"]

    def get_fee_history(self, block_count: int = 100,
                        newest_block: str = "latest",
                        reward_percentiles: list = [25, 50, 75]) -> pd.DataFrame:
        """
        Fetches EIP-1559 fee history — the cleanest dataset for training.

        eth_feeHistory returns per-block:
          - baseFeePerGas
          - gasUsedRatio
          - reward (priority fee percentiles)

        Args:
            block_count: Number of historical blocks
            newest_block: Start from this block
            reward_percentiles: Which priority fee percentiles to fetch

        Returns:
            pd.DataFrame with block-level EIP-1559 metrics
        """
        result = self._rpc("eth_feeHistory", [
            hex(block_count), newest_block, reward_percentiles
        ])

        base_fees = [int(x, 16) / 1e9 for x in result["baseFeePerGas"][:-1]]  # Gwei
        gas_ratios = result["gasUsedRatio"]
        rewards = result.get("reward", [[0, 0, 0]] * block_count)

        oldest_block = int(result["oldestBlock"], 16)

        records = []
        for i in range(len(base_fees)):
            r = rewards[i] if i < len(rewards) else [0, 0, 0]
            records.append({
                "block_number":    oldest_block + i,
                "base_fee_gwei":   round(base_fees[i], 4),
                "gas_used_ratio":  round(gas_ratios[i], 4),
                "priority_p25":    int(r[0], 16) / 1e9 if len(r) > 0 else 0,
                "priority_p50":    int(r[1], 16) / 1e9 if len(r) > 1 else 0,
                "priority_p75":    int(r[2], 16) / 1e9 if len(r) > 2 else 0,
            })

        df = pd.DataFrame(records)
        df["gas_price_gwei"] = df["base_fee_gwei"] + df["priority_p50"]
        print(f"[Alchemy] Fetched fee history: {len(df)} blocks")
        return df

    def get_mempool_stats(self) -> dict:
        """
        Fetches current pending transaction pool size.
        Critical feature for real-time prediction.

        Returns:
            {"pending": 1234, "queued": 567}
        """
        result = self._rpc("txpool_status", [])
        return {
            "pending": int(result.get("pending", "0x0"), 16),
            "queued":  int(result.get("queued", "0x0"), 16),
        }


# ─────────────────────────────────────────────
#  4. REAL-TIME RETRAINING SCHEDULER
# ─────────────────────────────────────────────

class RetrainingScheduler:
    """
    Periodically retrains the model on fresh blockchain data.

    Strategy Options:
      A. Periodic Full Retrain: Every 24h, retrain on last 30 days of data
      B. Sliding Window: Keep last N blocks, retrain every M new blocks
      C. Online Learning: Warm-start XGBoost with new data (incremental)

    Best practice: Retrain every 1,000 blocks (~3.3 hours) on last 50,000 blocks
    """

    def __init__(self, connector, model_dir: str = "model_artifacts"):
        self.connector = connector
        self.model_dir = model_dir
        self.block_buffer: List[dict] = []
        self.retrain_every = 1000   # blocks
        self.window_size   = 50000  # blocks to train on

    def on_new_block(self, block_data: dict):
        """
        Callback for streaming blocks. Buffers data and retrains when needed.

        Integrate with Web3BlockchainConnector.stream_blocks():
            connector.stream_blocks(scheduler.on_new_block)
        """
        self.block_buffer.append(block_data)

        if len(self.block_buffer) >= self.retrain_every:
            print(f"\n[RETRAIN] Buffer full ({self.retrain_every} blocks). Retraining...")
            self._retrain()
            self.block_buffer = []  # Clear buffer after retrain

    def _retrain(self):
        """Triggers a full retrain on the latest window of data."""
        from model import engineer_features, preprocess, train_model, save_model

        # In production: load from your time-series database (InfluxDB, Postgres, etc.)
        df = pd.DataFrame(self.block_buffer[-self.window_size:])

        if len(df) < 100:
            print("[RETRAIN] Not enough data. Skipping.")
            return

        try:
            data = preprocess(df)
            model = train_model(data["X_train"], data["y_train"])
            save_model(model, data["feature_names"], self.model_dir)
            print("[RETRAIN] Model updated successfully!")
        except Exception as e:
            print(f"[RETRAIN] Failed: {e}")


# ─────────────────────────────────────────────
#  USAGE EXAMPLES
# ─────────────────────────────────────────────

def example_web3_usage():
    """Example: Fetch live data and predict with trained model."""
    from model import load_model, engineer_features, select_features

    # 1. Connect to Ethereum
    connector = Web3BlockchainConnector(rpc_url=os.getenv("INFURA_URL"))

    # 2. Get latest block
    block_data = connector.get_block_data("latest")
    print(f"Block {block_data['block_number']}: {block_data['gas_price_gwei']:.2f} Gwei")

    # 3. Load model and predict
    model, feature_names = load_model()
    df = pd.DataFrame([block_data])
    df_feat = engineer_features(df)
    X, _, _ = select_features(df_feat)
    X = X.reindex(columns=feature_names, fill_value=0)
    predicted = model.predict(X.fillna(0))[0]
    print(f"Predicted next block gas: {predicted:.2f} Gwei")


def example_alchemy_fee_history():
    """Example: Build training dataset from Alchemy fee history."""
    connector = AlchemyConnector(api_key=os.getenv("ALCHEMY_API_KEY"))
    df = connector.get_fee_history(block_count=200)
    print(df.tail())
    return df


def example_etherscan_oracle():
    """Example: Get current gas oracle (no ML needed for simple use cases)."""
    connector = EtherscanConnector(api_key=os.getenv("ETHERSCAN_API_KEY"))
    oracle = connector.get_gas_oracle()
    print(f"Safe: {oracle['SafeGasPrice']} Gwei | "
          f"Standard: {oracle['ProposeGasPrice']} Gwei | "
          f"Fast: {oracle['FastGasPrice']} Gwei")


if __name__ == "__main__":
    # Quick test with Etherscan oracle (no credentials needed for this)
    print("Blockchain connector module loaded.")
    print("Set INFURA_URL / ETHERSCAN_API_KEY / ALCHEMY_API_KEY in .env to use live data.")