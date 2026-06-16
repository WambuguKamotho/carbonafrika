"""World Bank Open Data — global macro indicators (no key required).

API docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
Common indicator codes:
  NY.GDP.MKTP.KD.ZG  - GDP growth (annual %)
  FP.CPI.TOTL.ZG     - Inflation, consumer prices (annual %)
  SL.UEM.TOTL.ZS     - Unemployment, total (% of labor force)
  NE.TRD.GNFS.ZS     - Trade (% of GDP)
  BX.KLT.DINV.WD.GD.ZS - FDI net inflows (% of GDP)
"""
from __future__ import annotations

import logging
from typing import Dict, List

import requests

log = logging.getLogger(__name__)

WB_BASE = "https://api.worldbank.org/v2"
HEADERS = {"User-Agent": "ai-quant-bot/0.1 (research)"}

DEFAULT_INDICATORS = {
    "GDP_growth_pct": "NY.GDP.MKTP.KD.ZG",
    "Inflation_pct": "FP.CPI.TOTL.ZG",
    "Unemployment_pct": "SL.UEM.TOTL.ZS",
    "Trade_pct_GDP": "NE.TRD.GNFS.ZS",
}

DEFAULT_COUNTRIES = ["USA", "CHN", "DEU", "JPN", "GBR", "FRA", "IND", "BRA"]


def _fetch_latest(country: str, indicator: str) -> Dict | None:
    url = f"{WB_BASE}/country/{country}/indicator/{indicator}"
    try:
        r = requests.get(
            url,
            params={"format": "json", "per_page": 5, "MRV": 5},  # most recent 5 values
            headers=HEADERS,
            timeout=20,
        )
        r.raise_for_status()
        body = r.json()
        if not isinstance(body, list) or len(body) < 2 or not body[1]:
            return None
        # Find first non-null value (most recent year with data)
        for row in body[1]:
            if row.get("value") is not None:
                return {
                    "country": row.get("country", {}).get("value"),
                    "country_iso3": country,
                    "indicator": row.get("indicator", {}).get("value"),
                    "indicator_id": indicator,
                    "year": row.get("date"),
                    "value": round(float(row["value"]), 3),
                }
    except Exception as exc:  # noqa: BLE001
        log.warning("World Bank fetch failed %s/%s: %s", country, indicator, exc)
    return None


def gather_worldbank(
    countries: List[str] | None = None,
    indicators: Dict[str, str] | None = None,
) -> Dict[str, List[Dict]]:
    """Return {indicator_label: [{country, value, year}, ...]}."""
    countries = countries or DEFAULT_COUNTRIES
    indicators = indicators or DEFAULT_INDICATORS

    out: Dict[str, List[Dict]] = {label: [] for label in indicators}
    for label, code in indicators.items():
        for c in countries:
            row = _fetch_latest(c, code)
            if row:
                out[label].append({
                    "country": row["country"] or c,
                    "iso3": c,
                    "year": row["year"],
                    "value": row["value"],
                })
    log.info("World Bank pulled %d indicators across %d countries", len(indicators), len(countries))
    return out
