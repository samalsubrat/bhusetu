"""
=============================================================================
  REAL BLOCKCHAIN DATA COLLECTOR — Web3.py
=============================================================================
Fetches live Ethereum block data and builds a dataset ready for
model.py — completely replacing the simulated data.

SETUP:
  1. pip install web3 python-dotenv pandas
  2. Get a free RPC URL from any of:
       - Infura  → https://app.infura.io          (free tier: 100k req/day)
       - Alchemy → https://dashboard.alchemy.com  (free tier: 300M compute/mo)
       - QuickNode → https://quicknode.com        (free trial)
  3. Create a .env file in the same folder:
       RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY_HERE
  4. Run:
       python data_collector.py              # collect 500 latest blocks
       python data_collector.py --blocks 200 # collect 200 blocks
       python data_collector.py --start 21500000 --end 21500500  # block range

HOW IT CONNECTS TO model.py:
  The CSV this script saves is automatically picked up by model.py:

      df = load_or_simulate_data(csv_path="blockchain_data.csv")

  Just pass the CSV path and the whole ML pipeline runs on real data.
=============================================================================
"""

import os
import time
import argparse
import pandas as pd
import numpy as np
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()  # Reads RPC_URL from .env file


# ─────────────────────────────────────────────
#  CONNECTION
# ─────────────────────────────────────────────

def connect(rpc_url: str = None):
    """
    Creates and verifies a Web3 connection to an Ethereum node.

    Args:
        rpc_url: Infura/Alchemy/QuickNode HTTPS URL.
                 Falls back to RPC_URL environment variable.

    Returns:
        web3.Web3 instance (already verified as connected)

    Raises:
        ConnectionError if the node is unreachable
        ImportError if web3 is not installed
    """
    try:
        from web3 import Web3
    except ImportError:
        raise ImportError(
            "web3 not installed. Run:  pip install web3"
        )

    url = rpc_url or os.getenv("RPC_URL")
    if not url:
        raise ValueError(
            "No RPC URL found.\n"
            "Either pass rpc_url=... or set RPC_URL in your .env file.\n"
            "Get a free URL from https://app.infura.io or https://dashboard.alchemy.com"
        )

    w3 = Web3(Web3.HTTPProvider(url))

    if not w3.is_connected():
        raise ConnectionError(
            f"Could not connect to: {url}\n"
            "Check your API key and internet connection."
        )

    latest = w3.eth.block_number
    chain  = w3.eth.chain_id
    print(f"[Web3] Connected  |  Chain ID: {chain}  |  Latest block: {latest:,}")
    return w3


# ─────────────────────────────────────────────
#  SINGLE BLOCK FETCH
# ─────────────────────────────────────────────

def fetch_block(w3, block_id) -> dict | None:
    """
    Fetches one block and extracts all features the ML model needs.

    What we extract per block:
      - block_number, timestamp
      - gas_used, gas_limit           → block capacity metrics
      - base_fee                      → EIP-1559 base fee (Wei)
      - transaction_count             → demand proxy
      - avg_priority_fee              → average miner tip across txs
      - gas_price_gwei                → TARGET: effective price in Gwei

    Priority fee extraction logic (EIP-1559 post-London fork):
      - EIP-1559 tx (type 2): tip = min(maxPriorityFee, maxFee - baseFee)
      - Legacy tx (type 0/1):  tip = gasPrice - baseFee  (if positive)
      - Falls back to 2 Gwei if no transactions have fee data

    Args:
        w3:       Connected Web3 instance
        block_id: Block number (int) or "latest" / "pending" (str)

    Returns:
        dict of block features, or None if fetch failed
    """
    try:
        # full_transactions=True fetches each tx object (not just hashes)
        block = w3.eth.get_block(block_id, full_transactions=True)
    except Exception as e:
        print(f"  [!] Block {block_id} fetch failed: {e}")
        return None

    base_fee = block.get("baseFeePerGas", 0) or 0  # 0 for pre-London blocks

    # ── Compute per-transaction priority fees
    priority_fees = []
    for tx in block.transactions:
        try:
            if hasattr(tx, "maxPriorityFeePerGas") and tx.maxPriorityFeePerGas is not None:
                # EIP-1559 transaction
                effective_tip = min(
                    tx.maxPriorityFeePerGas,
                    (tx.maxFeePerGas or 0) - base_fee
                )
                priority_fees.append(max(0, effective_tip))
            elif hasattr(tx, "gasPrice") and tx.gasPrice and tx.gasPrice > base_fee:
                # Legacy transaction
                priority_fees.append(tx.gasPrice - base_fee)
        except Exception:
            continue  # Skip malformed transactions

    avg_priority = int(np.mean(priority_fees)) if priority_fees else 2_000_000_000

    # ── Effective gas price = base fee + average priority tip
    effective_price_gwei = (base_fee + avg_priority) / 1e9

    return {
        "block_number":      int(block.number),
        "timestamp":         datetime.utcfromtimestamp(int(block.timestamp)),
        "gas_used":          int(block.gasUsed),
        "gas_limit":         int(block.gasLimit),
        "base_fee":          int(base_fee),
        "transaction_count": len(block.transactions),
        "priority_fee":      int(avg_priority),
        "mempool_size":      None,         # Requires a debug/txpool-enabled node
        "gas_price_gwei":    round(effective_price_gwei, 6),
    }


# ─────────────────────────────────────────────
#  BATCH COLLECTION
# ─────────────────────────────────────────────

def collect_blocks(
    w3,
    n_blocks:    int = 500,
    start_block: int = None,
    end_block:   int = None,
    delay:       float = 0.15,
    save_every:  int = 50,
    output_csv:  str = "blockchain_data.csv",
) -> pd.DataFrame:
    """
    Collects a range of blocks and saves them progressively to CSV.

    Block range logic:
      - If start_block + end_block given → use that exact range
      - If only n_blocks given → latest N blocks (most recent data)

    Rate limiting:
      - Free Infura/Alchemy: ~10 req/s → delay=0.15s is safe
      - Paid plans: can reduce delay to 0.05s

    Progressive saving:
      - Saves to CSV every `save_every` blocks so you don't lose
        progress if the script is interrupted

    Args:
        w3:          Connected Web3 instance
        n_blocks:    Number of recent blocks to fetch (if no range given)
        start_block: First block to fetch (inclusive)
        end_block:   Last block to fetch (inclusive)
        delay:       Seconds to wait between RPC calls (rate limiting)
        save_every:  Save checkpoint CSV every N blocks
        output_csv:  Output CSV filename

    Returns:
        pd.DataFrame with all collected block data
    """
    latest = w3.eth.block_number

    # Determine block range
    if start_block is not None and end_block is not None:
        block_range = list(range(start_block, end_block + 1))
    else:
        block_range = list(range(latest - n_blocks + 1, latest + 1))

    total      = len(block_range)
    records    = []
    failed     = []
    start_time = time.time()

    print(f"\n[COLLECT] Fetching {total:,} blocks: {block_range[0]:,} → {block_range[-1]:,}")
    print(f"[COLLECT] Estimated time: ~{total * delay / 60:.1f} minutes at {delay}s/block")
    print(f"[COLLECT] Saving checkpoint every {save_every} blocks → {output_csv}\n")

    for i, bn in enumerate(block_range, 1):
        data = fetch_block(w3, bn)

        if data:
            records.append(data)
        else:
            failed.append(bn)

        # Progress update every 25 blocks
        if i % 25 == 0 or i == total:
            elapsed  = time.time() - start_time
            rate     = i / elapsed if elapsed > 0 else 0
            eta_secs = (total - i) / rate if rate > 0 else 0
            print(
                f"  [{i:>5}/{total}]  Block {bn:,}  |  "
                f"Collected: {len(records):,}  |  "
                f"Failed: {len(failed)}  |  "
                f"ETA: {eta_secs/60:.1f}m"
            )

        # Progressive save — don't lose progress on large runs
        if i % save_every == 0 and records:
            _save_checkpoint(records, output_csv)

        time.sleep(delay)  # Respect API rate limits

    # ── Final save
    df = pd.DataFrame(records)
    df = df.sort_values("block_number").reset_index(drop=True)
    df.to_csv(output_csv, index=False)

    elapsed = time.time() - start_time
    print(f"\n[COLLECT] Done in {elapsed/60:.1f} minutes")
    print(f"[COLLECT] Collected: {len(records):,}  |  Failed: {len(failed)}")
    print(f"[COLLECT] Saved to:  {output_csv}")

    if failed:
        print(f"[COLLECT] Failed blocks: {failed[:10]}{'...' if len(failed) > 10 else ''}")

    return df


def _save_checkpoint(records: list, path: str):
    """Saves current records to CSV (overwrites with latest full set)."""
    pd.DataFrame(records).to_csv(path, index=False)
    print(f"  [checkpoint] Saved {len(records):,} rows → {path}")


# ─────────────────────────────────────────────
#  FEE HISTORY (Faster Alternative)
# ─────────────────────────────────────────────

def collect_via_fee_history(
    w3,
    n_blocks:   int = 1000,
    percentiles: list = [25, 50, 75],
    output_csv: str  = "blockchain_data.csv",
) -> pd.DataFrame:
    """
    Collects block data using eth_feeHistory — much faster than block-by-block.

    eth_feeHistory is a single RPC call that returns data for up to 1024 blocks
    at once. It gives you baseFee + gasUsedRatio + priority fee percentiles.

    Limitation: No transaction_count or mempool_size (filled with estimates).

    Best for: Quickly building a large training dataset without rate limit pain.

    Args:
        w3:          Connected Web3 instance
        n_blocks:    How many blocks of history to fetch (max 1024 per call)
        percentiles: Priority fee percentiles to retrieve [25, 50, 75] = p25/p50/p75
        output_csv:  Output CSV path

    Returns:
        pd.DataFrame compatible with model.py
    """
    print(f"\n[FEE_HISTORY] Fetching {n_blocks} blocks via eth_feeHistory...")

    # eth_feeHistory can only return 1024 blocks per call — batch if needed
    records      = []
    remaining    = n_blocks
    newest_block = "latest"
    call_count   = 0

    while remaining > 0:
        batch_size   = min(remaining, 1024)
        call_count  += 1

        try:
            history = w3.eth.fee_history(
                block_count          = batch_size,
                newest_block         = newest_block,
                reward_percentiles   = percentiles,
            )
        except Exception as e:
            print(f"  [!] fee_history call {call_count} failed: {e}")
            break

        oldest_block = int(history.oldestBlock)
        base_fees    = history.baseFeePerGas[:-1]   # Last entry is next block's fee
        gas_ratios   = history.gasUsedRatio
        rewards      = history.reward or []

        for i in range(len(base_fees)):
            base_fee = base_fees[i]
            ratio    = gas_ratios[i]
            reward   = rewards[i] if i < len(rewards) else [2_000_000_000] * len(percentiles)

            # Use median (p50) priority fee as the priority_fee value
            p50_idx      = len(percentiles) // 2
            priority_fee = reward[p50_idx] if reward else 2_000_000_000

            # Estimate tx count from gas_used_ratio (typical: 200 txs at full block)
            tx_count_est = int(ratio * 200)

            records.append({
                "block_number":      oldest_block + i,
                "timestamp":         None,          # Not provided by fee_history
                "gas_used":          int(ratio * 30_000_000),   # Estimated
                "gas_limit":         30_000_000,
                "base_fee":          int(base_fee),
                "transaction_count": tx_count_est,
                "priority_fee":      int(priority_fee),
                "mempool_size":      None,
                "gas_price_gwei":    round((base_fee + priority_fee) / 1e9, 6),
                # Extra fee percentile columns (useful for richer models)
                f"priority_p{percentiles[0]}": reward[0] / 1e9 if len(reward) > 0 else None,
                f"priority_p{percentiles[1]}": reward[1] / 1e9 if len(reward) > 1 else None,
                f"priority_p{percentiles[2]}": reward[2] / 1e9 if len(reward) > 2 else None,
            })

        # Walk backwards for next batch
        remaining    -= batch_size
        newest_block  = oldest_block - 1

        print(f"  [call {call_count}] Got blocks {oldest_block:,} → {oldest_block + batch_size - 1:,}")
        time.sleep(0.1)  # Light rate limiting between batches

    df = pd.DataFrame(records)
    df = df.sort_values("block_number").reset_index(drop=True)

    # Reconstruct timestamps from block spacing (~12 seconds per block post-merge)
    if df["timestamp"].isna().all():
        try:
            latest_block    = w3.eth.get_block("latest")
            latest_ts       = int(latest_block.timestamp)
            latest_bn       = int(latest_block.number)
            df["timestamp"] = df["block_number"].apply(
                lambda bn: datetime.utcfromtimestamp(latest_ts - (latest_bn - bn) * 12)
            )
            print("  [FEE_HISTORY] Timestamps reconstructed from block spacing")
        except Exception as e:
            print(f"  [!] Could not reconstruct timestamps: {e}")
            df["timestamp"] = pd.Timestamp.utcnow()

    df.to_csv(output_csv, index=False)
    print(f"\n[FEE_HISTORY] Collected {len(df):,} blocks → {output_csv}")
    return df


# ─────────────────────────────────────────────
#  DATA QUALITY REPORT
# ─────────────────────────────────────────────

def print_data_summary(df: pd.DataFrame):
    """Prints a quick quality check of the collected dataset."""
    print("\n" + "="*55)
    print("  DATASET SUMMARY")
    print("="*55)
    print(f"  Rows:            {len(df):,}")
    print(f"  Block range:     {df['block_number'].min():,} → {df['block_number'].max():,}")
    if "timestamp" in df.columns and df["timestamp"].notna().any():
        print(f"  Time range:      {df['timestamp'].min()} → {df['timestamp'].max()}")
    print(f"  Gas price range: {df['gas_price_gwei'].min():.2f} → {df['gas_price_gwei'].max():.2f} Gwei")
    print(f"  Gas price mean:  {df['gas_price_gwei'].mean():.2f} Gwei")
    print(f"  Gas price std:   {df['gas_price_gwei'].std():.2f} Gwei")
    print(f"  Missing values:")
    for col in df.columns:
        n_null = df[col].isna().sum()
        if n_null > 0:
            print(f"    {col:25s}: {n_null:,} ({n_null/len(df)*100:.1f}%)")
    print("="*55)


# ─────────────────────────────────────────────
#  MAIN — Run directly or import as module
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Collect real Ethereum block data for gas fee ML model"
    )
    parser.add_argument("--rpc",       type=str,  default=None,
                        help="RPC URL (overrides .env RPC_URL)")
    parser.add_argument("--blocks",    type=int,  default=500,
                        help="Number of recent blocks to fetch (default: 500)")
    parser.add_argument("--start",     type=int,  default=None,
                        help="Start block number (use with --end)")
    parser.add_argument("--end",       type=int,  default=None,
                        help="End block number (use with --start)")
    parser.add_argument("--method",    type=str,  default="fee_history",
                        choices=["block_by_block", "fee_history"],
                        help="Collection method (default: fee_history — faster)")
    parser.add_argument("--delay",     type=float, default=0.15,
                        help="Delay between RPC calls in seconds (default: 0.15)")
    parser.add_argument("--output",    type=str,  default="blockchain_data.csv",
                        help="Output CSV filename (default: blockchain_data.csv)")
    parser.add_argument("--train",     action="store_true",
                        help="Immediately run model.py after collecting data")
    args = parser.parse_args()

    # Connect
    w3 = connect(args.rpc)

    # Collect
    if args.method == "fee_history":
        n = args.blocks
        if args.start and args.end:
            n = args.end - args.start + 1
        df = collect_via_fee_history(w3, n_blocks=n, output_csv=args.output)
    else:
        df = collect_blocks(
            w3,
            n_blocks    = args.blocks,
            start_block = args.start,
            end_block   = args.end,
            delay       = args.delay,
            output_csv  = args.output,
        )

    print_data_summary(df)

    # Optionally kick off model training immediately
    if args.train:
        print("\n[PIPELINE] Starting model training on collected data...")
        from model import main as train_main
        train_main(csv_path=args.output)


# ── Quick import usage (for use inside model.py or notebooks)
def get_real_data(rpc_url: str = None, n_blocks: int = 500,
                  method: str = "fee_history",
                  output_csv: str = "blockchain_data.csv") -> pd.DataFrame:
    """
    One-liner to get real blockchain data from anywhere in your code.

    Usage in model.py:
        from data_collector import get_real_data
        df = get_real_data(n_blocks=1000)
        data = preprocess(df)
        model = train_model(data["X_train"], data["y_train"])

    Usage in a notebook:
        from data_collector import get_real_data
        df = get_real_data(rpc_url="https://mainnet.infura.io/v3/YOUR_KEY", n_blocks=200)
        df.head()
    """
    w3 = connect(rpc_url)
    if method == "fee_history":
        return collect_via_fee_history(w3, n_blocks=n_blocks, output_csv=output_csv)
    else:
        return collect_blocks(w3, n_blocks=n_blocks, output_csv=output_csv)


if __name__ == "__main__":
    main()