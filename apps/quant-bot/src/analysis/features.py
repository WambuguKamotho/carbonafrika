"""Feature engineering on price data."""
from __future__ import annotations

from typing import Dict, List

import pandas as pd

from src.data.market_data import latest_snapshot


def per_sector_snapshot(prices: pd.DataFrame, sectors: Dict[str, List[str]]) -> Dict[str, pd.DataFrame]:
    """Group the snapshot table by sector for prompt construction."""
    snap = latest_snapshot(prices)
    out: Dict[str, pd.DataFrame] = {}
    for sector, tickers in sectors.items():
        present = [t for t in tickers if t in snap.index]
        out[sector] = snap.loc[present] if present else pd.DataFrame()
    return out


def df_to_records(df: pd.DataFrame, round_pct: bool = True) -> List[Dict]:
    """Pandas -> list of dicts with returns formatted as percentages."""
    if df is None or df.empty:
        return []
    df = df.copy().reset_index()
    pct_cols = [c for c in df.columns if c.startswith("ret_") or c.endswith("_ann")]
    if round_pct:
        for c in pct_cols:
            df[c] = (df[c] * 100).round(2)
    return df.to_dict(orient="records")
