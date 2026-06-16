"""OpenSky Network — live flight data as an economic activity proxy.

No API key required for anonymous access (rate-limited to ~10 req/10min).
https://opensky-network.org/apidoc/

Trading signals:
- Flight count by region as real-time economic activity indicator
- Low flights vs baseline → travel disruption → airline/hotel shorts
- Cargo hub activity → logistics/shipping ETF signals
- Cross-border routes → trade flow proxy
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

import requests

log = logging.getLogger(__name__)

_BASE = "https://opensky-network.org/api/states/all"

# Economic corridors to monitor (lat_min, lat_max, lon_min, lon_max)
_REGIONS = [
    {
        "name": "US_Northeast_Corridor",
        "bbox": (38, 45, -76, -68),
        "proxy_for": "US domestic economy, NYC/Boston/DC activity",
        "tickers": ["SPY", "XLF", "IYT"],
    },
    {
        "name": "Europe_Hub",
        "bbox": (47, 55, 2, 18),
        "proxy_for": "European economic activity (Frankfurt/Amsterdam/Paris)",
        "tickers": ["EFA", "EWG", "FEZ"],
    },
    {
        "name": "Asia_Pacific_Hub",
        "bbox": (22, 38, 100, 140),
        "proxy_for": "China/Japan/Korea trade activity",
        "tickers": ["FXI", "EWJ", "EWT"],
    },
    {
        "name": "Gulf_Middle_East",
        "bbox": (22, 30, 45, 60),
        "proxy_for": "Oil region air traffic, cargo/logistics",
        "tickers": ["CL=F", "BZ=F"],
    },
    {
        "name": "East_Africa",
        "bbox": (-5, 10, 30, 45),
        "proxy_for": "East Africa economic activity (Kenya/Ethiopia/Tanzania)",
        "tickers": ["EZA", "AFK"],
    },
]

# Rough baseline flight counts per region (calibrated for typical weekday)
_BASELINES = {
    "US_Northeast_Corridor": 800,
    "Europe_Hub": 1200,
    "Asia_Pacific_Hub": 900,
    "Gulf_Middle_East": 400,
    "East_Africa": 80,
}


def _flight_signal(count: int, baseline: int) -> str:
    if baseline == 0:
        return "unknown"
    ratio = count / baseline
    if ratio < 0.5:
        return "severe_disruption"
    if ratio < 0.8:
        return "below_normal"
    if ratio > 1.3:
        return "elevated"
    return "normal"


def gather_flight_activity() -> List[Dict[str, Any]]:
    """Return flight count and activity signal for key economic corridors."""
    results = []

    for region in _REGIONS:
        lat_min, lat_max, lon_min, lon_max = region["bbox"]
        try:
            resp = requests.get(
                _BASE,
                params={
                    "lamin": lat_min, "lamax": lat_max,
                    "lomin": lon_min, "lomax": lon_max,
                },
                timeout=15,
            )
            if not resp.ok:
                log.debug("OpenSky error for %s: %s", region["name"], resp.status_code)
                continue

            data = resp.json()
            states = data.get("states") or []
            count = len(states)
            baseline = _BASELINES.get(region["name"], 200)

            results.append({
                "region": region["name"],
                "flight_count": count,
                "baseline": baseline,
                "ratio_vs_baseline": round(count / baseline, 2) if baseline else None,
                "signal": _flight_signal(count, baseline),
                "proxy_for": region["proxy_for"],
                "related_tickers": region["tickers"],
            })
            log.debug("OpenSky %s: %d flights (baseline %d)", region["name"], count, baseline)

        except Exception as exc:
            log.debug("OpenSky skipped %s: %s", region["name"], exc)

    log.info("Satellite flight activity: %d regions", len(results))
    return results
