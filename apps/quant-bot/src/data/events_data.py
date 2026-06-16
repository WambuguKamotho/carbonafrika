"""Global event signals — earthquakes (USGS), severe weather (NOAA NWS), NASA EONET."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List

import requests

log = logging.getLogger(__name__)

USGS_QUAKE_FEED = "https://earthquake.usgs.gov/fdsnws/event/1/query"
NOAA_ALERTS = "https://api.weather.gov/alerts/active"
EONET_API = "https://eonet.gsfc.nasa.gov/api/v3/events"
HEADERS = {"User-Agent": "ai-quant-bot/0.1 (research)"}

# EONET categories that matter for markets
_MARKET_RELEVANT_CATEGORIES = {
    "wildfires",        # energy, agriculture, insurance
    "volcanoes",        # aviation, agriculture, commodities
    "severe storms",    # agriculture, insurance, infrastructure
    "tropical storms",  # energy, agriculture, shipping
    "floods",           # agriculture, infrastructure
    "drought",          # agriculture, food prices
    "sea and lake ice", # shipping routes
    "landslides",       # mining, infrastructure
}


def fetch_eonet_events(days_back: int = 7, limit: int = 30) -> List[Dict]:
    """NASA EONET natural events — no API key required."""
    since = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%SZ")
    params = {
        "status": "open",
        "limit": limit,
        "start": since,
    }
    try:
        r = requests.get(EONET_API, params=params, headers=HEADERS, timeout=20)
        r.raise_for_status()
        events = r.json().get("events", [])
        out: List[Dict] = []
        for ev in events:
            categories = [c.get("title", "").lower() for c in ev.get("categories", [])]
            market_relevant = any(
                any(cat in c for c in categories)
                for cat in _MARKET_RELEVANT_CATEGORIES
            )
            # Most recent geometry point
            geometries = ev.get("geometry", [])
            coords = None
            if geometries:
                latest = geometries[-1]
                coords = latest.get("coordinates")  # [lon, lat] or [lon, lat, alt]

            out.append({
                "id": ev.get("id"),
                "title": ev.get("title"),
                "categories": [c.get("title") for c in ev.get("categories", [])],
                "status": ev.get("status", "open"),
                "market_relevant": market_relevant,
                "coordinates": coords[:2] if coords and len(coords) >= 2 else None,
                "updated": ev.get("geometry", [{}])[-1].get("date") if geometries else None,
                "url": ev.get("link"),
            })
        log.info("EONET: %d open events (%d market-relevant)",
                 len(out), sum(1 for e in out if e["market_relevant"]))
        return out
    except Exception as exc:
        log.warning("EONET fetch failed: %s", exc)
        return []


def fetch_earthquakes(min_magnitude: float = 5.5, days_back: int = 2) -> List[Dict]:
    """USGS earthquakes >= magnitude in the last N days."""
    since = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%S")
    params = {
        "format": "geojson",
        "starttime": since,
        "minmagnitude": min_magnitude,
        "orderby": "magnitude",
    }
    try:
        r = requests.get(USGS_QUAKE_FEED, params=params, headers=HEADERS, timeout=15)
        r.raise_for_status()
        feats = r.json().get("features", [])
        return [
            {
                "magnitude": f["properties"].get("mag"),
                "place": f["properties"].get("place"),
                "time_utc": datetime.fromtimestamp(
                    f["properties"]["time"] / 1000, tz=timezone.utc
                ).isoformat(),
                "url": f["properties"].get("url"),
                "tsunami": bool(f["properties"].get("tsunami")),
            }
            for f in feats
        ]
    except Exception as exc:  # noqa: BLE001
        log.warning("USGS fetch failed: %s", exc)
        return []


_SEVERITY_ORDER = {"minor": 0, "moderate": 1, "severe": 2, "extreme": 3}


def fetch_weather_alerts(min_severity: str = "severe", limit: int = 30) -> List[Dict]:
    """US National Weather Service active alerts at or above the given severity."""
    threshold = _SEVERITY_ORDER.get(min_severity.lower(), 2)
    try:
        r = requests.get(NOAA_ALERTS, headers=HEADERS, timeout=15)
        r.raise_for_status()
        feats = r.json().get("features", [])
        out: List[Dict] = []
        for f in feats:
            p = f.get("properties", {})
            sev = (p.get("severity") or "").lower()
            if _SEVERITY_ORDER.get(sev, -1) < threshold:
                continue
            out.append({
                "event": p.get("event"),
                "severity": p.get("severity"),
                "headline": p.get("headline"),
                "area": p.get("areaDesc"),
                "sent": p.get("sent"),
                "ends": p.get("ends"),
            })
            if len(out) >= limit:
                break
        return out
    except Exception as exc:  # noqa: BLE001
        log.warning("NOAA alerts fetch failed: %s", exc)
        return []


def gather_events(min_quake: float, min_weather_severity: str) -> Dict[str, List[Dict]]:
    return {
        "earthquakes": fetch_earthquakes(min_magnitude=min_quake),
        "weather_alerts": fetch_weather_alerts(min_severity=min_weather_severity),
        "eonet_natural_events": fetch_eonet_events(days_back=7, limit=25),
    }
