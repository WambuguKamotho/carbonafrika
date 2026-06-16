"""NASA FIRMS — active fire detection in key agricultural and energy regions.

Free API key: https://firms.modaps.eosdis.nasa.gov/api/ (instant, no credit card)
If key not set, module skips gracefully.

Trading signals:
- Fires in grain belt (Ukraine, US) → wheat/corn supply shock
- Fires in Indonesia/Malaysia → palm oil disruption
- Fires in Canadian boreal → lumber, natural gas
- Fires near oil infrastructure → crude price spike risk
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import requests

log = logging.getLogger(__name__)

_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/json"

# Key agricultural/energy regions to monitor
_REGIONS = [
    {
        "name": "Ukraine_BlackSea_Wheat",
        "bbox": "22,44,40,52",   # lon_min,lat_min,lon_max,lat_max
        "crops": ["wheat", "corn", "sunflower"],
        "tickers": ["WEAT", "CORN", "ZW=F", "ZC=F"],
    },
    {
        "name": "US_CornBelt",
        "bbox": "-100,37,-82,47",
        "crops": ["corn", "soy"],
        "tickers": ["CORN", "ZC=F", "ZS=F", "SOYB"],
    },
    {
        "name": "Brazil_Cerrado_Soy",
        "bbox": "-60,-20,-42,-5",
        "crops": ["soy", "sugar"],
        "tickers": ["ZS=F", "SOYB", "CANE"],
    },
    {
        "name": "Indonesia_PalmOil",
        "bbox": "95,-8,141,6",
        "crops": ["palm oil"],
        "tickers": ["MOO", "DBA"],
    },
    {
        "name": "Canada_Boreal_Lumber",
        "bbox": "-135,50,-60,65",
        "crops": ["timber"],
        "tickers": ["LBS=F", "WFG"],
    },
    {
        "name": "MiddleEast_Oil",
        "bbox": "35,12,60,35",
        "crops": [],
        "tickers": ["CL=F", "BZ=F", "XLE"],
    },
]


def _fire_signal(count: int, region: str) -> str:
    if count == 0:
        return "clear"
    if count < 10:
        return "low"
    if count < 50:
        return "elevated"
    return "severe"


def gather_fires(api_key: str, days_back: int = 1) -> List[Dict[str, Any]]:
    """Return fire activity summary for each monitored region."""
    if not api_key:
        log.info("FIRMS_API_KEY not set — skipping satellite fire data")
        return []

    results = []
    for region in _REGIONS:
        try:
            url = f"{_BASE}/{api_key}/VIIRS_SNPP_NRT/{region['bbox']}/{days_back}"
            resp = requests.get(url, timeout=15)
            if not resp.ok:
                log.debug("FIRMS error for %s: %s", region["name"], resp.status_code)
                continue

            fires = resp.json() if resp.text.strip().startswith("[") else []
            count = len(fires)

            # Max fire radiative power (intensity proxy)
            frp_values = [f.get("frp", 0) for f in fires if f.get("frp")]
            max_frp = round(max(frp_values), 1) if frp_values else 0
            avg_frp = round(sum(frp_values) / len(frp_values), 1) if frp_values else 0

            results.append({
                "region": region["name"],
                "fire_count": count,
                "max_frp_mw": max_frp,
                "avg_frp_mw": avg_frp,
                "signal": _fire_signal(count, region["name"]),
                "affected_crops": region["crops"],
                "related_tickers": region["tickers"],
            })
            log.debug("FIRMS %s: %d fires", region["name"], count)

        except Exception as exc:
            log.debug("FIRMS skipped %s: %s", region["name"], exc)

    log.info("Satellite fires: %d regions monitored", len(results))
    return results
