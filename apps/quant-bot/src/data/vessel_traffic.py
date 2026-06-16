"""Maritime vessel traffic signals via Vessel API.

Watches key commodity shipping chokepoints and counts vessels by type.
Compares current density against a rolling baseline to generate
supply-chain signals for oil, LNG, and bulk commodities.

Chokepoints monitored:
  - Persian Gulf      → crude oil supply
  - Strait of Hormuz  → oil/LNG flow (Iran risk)
  - Black Sea         → grain flows (Ukraine/Russia)
  - US Gulf Coast     → US crude/LNG exports
  - Rotterdam         → European energy imports
  - Strait of Malacca → Asia-Pacific trade flows
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests

log = logging.getLogger(__name__)

_BASE = "https://api.vesselapi.com/v1"
_TIMEOUT = 15

# Vessel type codes that matter for commodity signals
_TANKER_TYPES   = {80, 81, 82, 83, 84, 85, 86, 87, 88, 89}  # crude/product tankers
_BULKER_TYPES   = {70, 71, 72, 73, 74, 75, 76, 77, 78, 79}  # bulk carriers
_LNG_TYPES      = {90, 91, 92, 93, 94, 95, 96, 97, 98, 99}  # gas carriers

# Bounding boxes: (lat_bottom, lat_top, lon_left, lon_right)
# API constraint: |dLat| + |dLon| must be ≤ 4 degrees total
_ZONES: List[Dict[str, Any]] = [
    {
        "name": "Persian Gulf",
        "commodity": "crude_oil",
        "related_tickers": ["CL=F", "BZ=F", "XLE", "XOM"],
        "bbox": (25.5, 27.5, 51.0, 53.0),   # dLat=2 + dLon=2 = 4 ✓
    },
    {
        "name": "Strait of Hormuz",
        "commodity": "oil_lng",
        "related_tickers": ["CL=F", "NG=F", "BZ=F"],
        "bbox": (26.0, 27.0, 56.5, 58.5),   # dLat=1 + dLon=2 = 3 ✓
    },
    {
        "name": "Black Sea",
        "commodity": "grain",
        "related_tickers": ["ZW=F", "ZC=F", "WEAT", "CORN"],
        "bbox": (43.0, 45.0, 30.0, 32.0),   # dLat=2 + dLon=2 = 4 ✓
    },
    {
        "name": "US Gulf Coast",
        "commodity": "us_crude_lng",
        "related_tickers": ["CL=F", "NG=F", "XLE"],
        "bbox": (27.5, 29.5, -92.0, -90.0), # dLat=2 + dLon=2 = 4 ✓
    },
    {
        "name": "Rotterdam",
        "commodity": "european_energy",
        "related_tickers": ["BZ=F", "NG=F", "TTE"],
        "bbox": (51.8, 52.2, 4.0, 5.0),     # dLat=0.4 + dLon=1 = 1.4 ✓
    },
    {
        "name": "Strait of Malacca",
        "commodity": "asia_trade",
        "related_tickers": ["CL=F", "EWS", "FXI", "EWJ"],
        "bbox": (1.5, 3.5, 101.0, 103.0),   # dLat=2 + dLon=2 = 4 ✓
    },
]

# Baselines calibrated to the API's bounding-box page return (first 50 vessels).
# These will self-tune over time — edit after ~1 week of runs.
_BASELINES: Dict[str, int] = {
    "Persian Gulf":       12,
    "Strait of Hormuz":    5,
    "Black Sea":           5,
    "US Gulf Coast":       8,
    "Rotterdam":          20,
    "Strait of Malacca":  22,
}
_SPIKE_THRESHOLD  = 0.40   # >40% above baseline → surge
_DROP_THRESHOLD   = 0.40   # >40% below baseline → drought


def _get(api_key: str, path: str, params: Dict) -> Optional[Dict]:
    try:
        r = requests.get(
            f"{_BASE}{path}",
            headers={"Authorization": f"Bearer {api_key}"},
            params=params,
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        log.warning("Vessel API %s: %s", path, e)
        return None
    except Exception as e:
        log.warning("Vessel API error: %s", e)
        return None




def _fetch_zone(api_key: str, zone: Dict) -> Dict[str, Any]:
    """Fetch vessel counts for one zone bounding box."""
    lat_bot, lat_top, lon_left, lon_right = zone["bbox"]
    params = {
        "filter.latBottom": lat_bot,
        "filter.latTop":    lat_top,
        "filter.lonLeft":   lon_left,
        "filter.lonRight":  lon_right,
    }
    data = _get(api_key, "/location/vessels/bounding-box", params)
    if data is None:
        return {"zone": zone["name"], "error": True}
    vessels = data.get("data") or data.get("vessels") or []
    total   = len(vessels)
    tankers = sum(1 for v in vessels if _vessel_type_code(v) in _TANKER_TYPES)
    bulkers = sum(1 for v in vessels if _vessel_type_code(v) in _BULKER_TYPES)
    lng     = sum(1 for v in vessels if _vessel_type_code(v) in _LNG_TYPES)

    baseline = _BASELINES.get(zone["name"], 20)
    ratio    = total / baseline if baseline else 1.0

    if ratio >= 1 + _SPIKE_THRESHOLD:
        signal = "surge"
        interpretation = (
            f"Vessel traffic {ratio:.0%} of baseline — supply surge or congestion risk"
        )
    elif ratio <= 1 - _DROP_THRESHOLD:
        signal = "drought"
        interpretation = (
            f"Vessel traffic only {ratio:.0%} of baseline — supply disruption risk"
        )
    else:
        signal = "normal"
        interpretation = f"Traffic within normal range ({ratio:.0%} of baseline)"

    return {
        "zone":             zone["name"],
        "commodity":        zone["commodity"],
        "related_tickers":  zone["related_tickers"],
        "total_vessels":    total,
        "tankers":          tankers,
        "bulkers":          bulkers,
        "lng_carriers":     lng,
        "baseline":         baseline,
        "ratio_vs_baseline": round(ratio, 2),
        "signal":           signal,
        "interpretation":   interpretation,
        "fetched_utc":      datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M"),
    }


def _vessel_type_code(vessel: Dict) -> int:
    """Extract numeric vessel type code from a vessel record."""
    try:
        vtype = vessel.get("type") or vessel.get("vessel_type") or {}
        if isinstance(vtype, dict):
            return int(vtype.get("code", 0) or 0)
        return int(vtype or 0)
    except (TypeError, ValueError):
        return 0


_CACHE_TTL_HOURS = 6
_vessel_cache: Dict[str, Tuple[str, Dict]] = {}  # zone_name → (cache_key, result)


def _cache_key() -> str:
    """6-hour bucket key — same for all calls within the same 6h window."""
    now = datetime.now(timezone.utc)
    bucket = now.hour // _CACHE_TTL_HOURS
    return f"{now.strftime('%Y-%m-%d')}-{bucket}"


def gather_vessel_traffic(api_key: str, delay_s: float = 0.5) -> List[Dict]:
    """
    Fetch vessel traffic for all monitored zones with 6h in-memory caching.
    Returns list of zone dicts with count, signal, and interpretation.
    """
    if not api_key:
        log.warning("VESSEL_API_KEY not set — skipping vessel traffic")
        return []

    key = _cache_key()
    results = []
    fresh_fetches = 0

    for zone in _ZONES:
        zone_name = zone["name"]
        cached = _vessel_cache.get(zone_name)
        if cached and cached[0] == key:
            results.append(cached[1])
            continue

        result = _fetch_zone(api_key, zone)
        _vessel_cache[zone_name] = (key, result)
        results.append(result)
        fresh_fetches += 1
        if fresh_fetches < len(_ZONES):
            time.sleep(delay_s)

    actionable = [r for r in results if r.get("signal") != "normal"]
    log.info(
        "Vessel traffic: %d zones (%d fresh, %d cached), %d with notable signals",
        len(results), fresh_fetches, len(results) - fresh_fetches, len(actionable),
    )
    return results
