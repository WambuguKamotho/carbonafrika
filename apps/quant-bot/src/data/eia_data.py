"""US Energy Information Administration (EIA) — oil, gas, electricity data.

Free API key: https://www.eia.gov/opendata/register.php
Docs: https://www.eia.gov/opendata/documentation.php

Common useful series IDs:
  PET.WCRSTUS1.W      - US crude oil stocks (weekly, thousand barrels)
  PET.WGTSTUS1.W      - US total motor gasoline stocks
  NG.NW2_EPG0_SWO_R48_BCF.W - US natural gas working storage (weekly, Bcf)
  PET.RWTC.D          - WTI spot price (daily, $/bbl)
  PET.RBRTE.D         - Brent spot price (daily, $/bbl)
"""
from __future__ import annotations

import logging
from typing import Dict, List

import requests

log = logging.getLogger(__name__)

EIA_V2_BASE = "https://api.eia.gov/v2/seriesid"
HEADERS = {"User-Agent": "ai-quant-bot/0.1 (research)"}

DEFAULT_SERIES = {
    "WTI_spot": "PET.RWTC.D",
    "Brent_spot": "PET.RBRTE.D",
    "US_crude_stocks": "PET.WCRSTUS1.W",
    "US_gasoline_stocks": "PET.WGTSTUS1.W",
    "US_natgas_storage": "NG.NW2_EPG0_SWO_R48_BCF.W",
}


def fetch_eia_series(series_id: str, api_key: str, length: int = 12) -> List[Dict]:
    """Most recent N observations of an EIA series."""
    if not api_key:
        return []
    url = f"{EIA_V2_BASE}/{series_id}"
    try:
        r = requests.get(
            url,
            params={"api_key": api_key, "length": length, "sort[0][column]": "period", "sort[0][direction]": "desc"},
            headers=HEADERS,
            timeout=20,
        )
        r.raise_for_status()
        body = r.json()
        rows = (body.get("response") or {}).get("data") or []
        return [
            {
                "period": row.get("period"),
                "value": float(row["value"]) if row.get("value") not in (None, "") else None,
                "units": row.get("units"),
            }
            for row in rows
        ]
    except Exception as exc:  # noqa: BLE001
        log.warning("EIA fetch failed for %s: %s", series_id, exc)
        return []


def gather_eia(api_key: str, series_map: Dict[str, str] | None = None) -> Dict[str, Dict]:
    """For each named series return latest, prev, % change, and short history."""
    if not api_key:
        log.warning("EIA_API_KEY not set — skipping energy data")
        return {}
    series_map = series_map or DEFAULT_SERIES
    out: Dict[str, Dict] = {}
    for name, sid in series_map.items():
        data = fetch_eia_series(sid, api_key, length=12)
        if not data:
            continue
        latest = data[0].get("value")
        prev = data[1].get("value") if len(data) > 1 else None
        pct_change = None
        if latest is not None and prev not in (None, 0):
            pct_change = round((latest / prev - 1) * 100, 2)
        out[name] = {
            "series_id": sid,
            "units": data[0].get("units"),
            "latest_period": data[0].get("period"),
            "latest": latest,
            "prev": prev,
            "pct_change": pct_change,
            "history": data,
        }
    log.info("EIA pulled %d series", len(out))
    return out
