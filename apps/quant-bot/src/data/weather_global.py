"""Open-Meteo — free global weather forecasts (no key).

Docs: https://open-meteo.com/en/docs

We pull short forecasts for economically-relevant locations:
  - shipping chokepoints (Gulf of Mexico, Singapore, Suez)
  - energy hubs (Houston, Permian Basin)
  - agricultural belts (US Midwest, Brazil, Black Sea)
"""
from __future__ import annotations

import logging
from typing import Dict, List

import requests

log = logging.getLogger(__name__)

OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
HEADERS = {"User-Agent": "ai-quant-bot/0.1 (research)"}

# Economically-significant locations
DEFAULT_LOCATIONS = [
    {"name": "Houston (US energy hub)",        "lat": 29.76, "lon": -95.37},
    {"name": "New Orleans (Gulf shipping)",    "lat": 29.95, "lon": -90.07},
    {"name": "US Midwest (agriculture)",       "lat": 41.88, "lon": -93.10},
    {"name": "Singapore (shipping)",           "lat":  1.35, "lon": 103.82},
    {"name": "Suez Canal",                     "lat": 30.55, "lon":  32.34},
    {"name": "Rotterdam (Europe shipping)",    "lat": 51.95, "lon":  4.14},
    {"name": "Sao Paulo (Brazil agri)",        "lat": -23.55,"lon": -46.63},
    {"name": "Black Sea (grain export)",       "lat": 44.62, "lon":  33.52},
]


def fetch_forecast(lat: float, lon: float) -> Dict:
    """3-day daily summary: max temp, min temp, precipitation, wind."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code",
        "forecast_days": 3,
        "timezone": "auto",
    }
    try:
        r = requests.get(OPEN_METEO, params=params, headers=HEADERS, timeout=15)
        r.raise_for_status()
        data = r.json().get("daily", {})
        return data
    except Exception as exc:  # noqa: BLE001
        log.warning("Open-Meteo fetch failed (%s,%s): %s", lat, lon, exc)
        return {}


def gather_weather(locations: List[Dict] | None = None) -> List[Dict]:
    locations = locations or DEFAULT_LOCATIONS
    out: List[Dict] = []
    for loc in locations:
        forecast = fetch_forecast(loc["lat"], loc["lon"])
        if not forecast:
            continue
        # take day-1 summary for compactness
        out.append({
            "location": loc["name"],
            "lat": loc["lat"],
            "lon": loc["lon"],
            "date": (forecast.get("time") or [None])[0],
            "tmax_c": (forecast.get("temperature_2m_max") or [None])[0],
            "tmin_c": (forecast.get("temperature_2m_min") or [None])[0],
            "precip_mm": (forecast.get("precipitation_sum") or [None])[0],
            "wind_max_kmh": (forecast.get("wind_speed_10m_max") or [None])[0],
            "weather_code": (forecast.get("weather_code") or [None])[0],
        })
    log.info("Open-Meteo pulled %d locations", len(out))
    return out
