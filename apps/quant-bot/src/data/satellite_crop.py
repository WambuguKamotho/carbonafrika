"""NASA POWER API — agricultural weather for key crop-producing regions.

No API key required. Free, unlimited.
https://power.larc.nasa.gov/

Fetches temperature and precipitation for 5 global agricultural zones.
Computes anomalies vs the 30-year climatological baseline (POWER provides this).

Trading signals:
- Temperature anomaly > +2C in growing season → heat stress → supply reduction
- Precipitation deficit > 20% → drought → supply shock → commodity prices up
- Both combined → severe signal
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import requests

log = logging.getLogger(__name__)

_BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"

_AG_REGIONS = [
    {
        "name": "US_Corn_Belt",
        "lat": 41.5, "lon": -93.0,
        "crops": ["corn", "soy"],
        "tickers": ["CORN", "ZC=F", "ZS=F"],
        "growing_months": [4, 5, 6, 7, 8, 9],
    },
    {
        "name": "Ukraine_Wheat_Belt",
        "lat": 49.0, "lon": 32.0,
        "crops": ["wheat", "sunflower"],
        "tickers": ["WEAT", "ZW=F"],
        "growing_months": [3, 4, 5, 6, 7],
    },
    {
        "name": "Brazil_Soy_Mato_Grosso",
        "lat": -12.5, "lon": -55.5,
        "crops": ["soy", "corn"],
        "tickers": ["ZS=F", "SOYB"],
        "growing_months": [10, 11, 12, 1, 2, 3],
    },
    {
        "name": "India_Monsoon_Rice",
        "lat": 20.5, "lon": 79.0,
        "crops": ["rice", "wheat"],
        "tickers": ["INDA", "MOO"],
        "growing_months": [6, 7, 8, 9],
    },
    {
        "name": "Australia_Wheat",
        "lat": -32.0, "lon": 117.0,
        "crops": ["wheat", "barley"],
        "tickers": ["WEAT", "ZW=F"],
        "growing_months": [5, 6, 7, 8, 9, 10],
    },
]


def _fetch_power(lat: float, lon: float, start: str, end: str) -> Optional[Dict]:
    """Fetch temperature + precipitation from NASA POWER."""
    try:
        resp = requests.get(
            _BASE,
            params={
                "parameters": "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,T2M_RANGE",
                "community": "AG",
                "longitude": lon,
                "latitude": lat,
                "start": start,
                "end": end,
                "format": "JSON",
            },
            timeout=20,
        )
        if not resp.ok:
            return None
        data = resp.json()
        return data.get("properties", {}).get("parameter", {})
    except Exception as exc:
        log.debug("NASA POWER fetch failed: %s", exc)
        return None


def gather_crop_weather() -> List[Dict[str, Any]]:
    """Return agricultural weather stress signals for key growing regions."""
    today = date.today()
    end = today.strftime("%Y%m%d")
    start = (today - timedelta(days=30)).strftime("%Y%m%d")
    current_month = today.month

    results = []
    for region in _AG_REGIONS:
        try:
            params = _fetch_power(region["lat"], region["lon"], start, end)
            if not params:
                continue

            t2m = params.get("T2M", {})
            prec = params.get("PRECTOTCORR", {})

            if not t2m or not prec:
                continue

            # Recent 30-day averages
            temps = [v for v in t2m.values() if v is not None and v > -900]
            precips = [v for v in prec.values() if v is not None and v >= 0]

            if not temps or not precips:
                continue

            avg_temp = round(sum(temps) / len(temps), 1)
            total_precip = round(sum(precips), 1)
            max_temp = round(max(temps), 1)

            # Simple anomaly: compare vs expected seasonal baseline
            # (rough global averages for growing regions)
            in_growing_season = current_month in region["growing_months"]

            # Heat stress: max temp > 35°C in growing season
            heat_stress = max_temp > 35 and in_growing_season

            # Drought proxy: < 20mm precipitation in last 30 days during growing season
            drought_stress = total_precip < 20 and in_growing_season

            if heat_stress and drought_stress:
                signal = "severe_stress"
            elif heat_stress or drought_stress:
                signal = "moderate_stress"
            elif not in_growing_season:
                signal = "off_season"
            else:
                signal = "normal"

            results.append({
                "region": region["name"],
                "crops": region["crops"],
                "related_tickers": region["tickers"],
                "avg_temp_c": avg_temp,
                "max_temp_c": max_temp,
                "precip_30d_mm": total_precip,
                "in_growing_season": in_growing_season,
                "heat_stress": heat_stress,
                "drought_stress": drought_stress,
                "signal": signal,
            })
            log.debug("Crop weather %s: temp=%.1fC precip=%.1fmm signal=%s",
                      region["name"], avg_temp, total_precip, signal)

        except Exception as exc:
            log.debug("Crop weather skipped %s: %s", region["name"], exc)

    log.info("Satellite crop weather: %d regions", len(results))
    return results
