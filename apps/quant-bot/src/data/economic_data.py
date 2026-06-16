"""Macro indicators via FRED (Federal Reserve Economic Data)."""
from __future__ import annotations

import logging
from typing import Dict

import pandas as pd

log = logging.getLogger(__name__)


def fetch_fred_series(series_map: Dict[str, str], api_key: str) -> pd.DataFrame:
    """Return a long-form DataFrame: name | series_id | latest | prev | yoy_pct | as_of."""
    if not api_key:
        log.warning("FRED_API_KEY not set — skipping macro data")
        return pd.DataFrame()
    if not series_map:
        return pd.DataFrame()

    try:
        from fredapi import Fred  # imported lazily so module imports without the dep
    except ImportError:
        log.error("fredapi is not installed (`pip install fredapi`)")
        return pd.DataFrame()

    fred = Fred(api_key=api_key)
    rows = []
    for name, sid in series_map.items():
        try:
            s = fred.get_series(sid).dropna()
            if s.empty:
                continue
            latest = float(s.iloc[-1])
            prev = float(s.iloc[-2]) if len(s) > 1 else None
            year_ago = s.asof(s.index[-1] - pd.DateOffset(years=1))
            yoy = None
            if pd.notna(year_ago) and float(year_ago) != 0.0:
                yoy = float(latest / float(year_ago) - 1.0)
            rows.append({
                "name": name,
                "series_id": sid,
                "latest": round(latest, 4),
                "prev": None if prev is None else round(prev, 4),
                "yoy_pct": None if yoy is None else round(yoy * 100, 2),
                "as_of": str(s.index[-1].date()),
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("FRED fetch failed for %s (%s): %s", name, sid, exc)

    return pd.DataFrame(rows)


def yield_curve_signal(df: pd.DataFrame) -> Dict[str, object]:
    """Return the 10y-2y spread snapshot from a FRED dataframe, if both exist."""
    if df.empty:
        return {}
    by_name = {r["name"]: r for _, r in df.iterrows()}
    y10 = by_name.get("Yield_10y")
    y2 = by_name.get("Yield_2y")
    if y10 is None or y2 is None:
        return {}
    spread = float(y10["latest"]) - float(y2["latest"])
    return {
        "10y": float(y10["latest"]),
        "2y": float(y2["latest"]),
        "spread_bps": round(spread * 100, 1),
        "inverted": spread < 0,
    }
