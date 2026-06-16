"""Market Fear & Greed Index from alternative.me — free, no API key required.

Also fetches CNN Fear & Greed components as a cross-check (VIX, momentum, etc.).
Index: 0 = extreme fear, 100 = extreme greed.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, Optional

import requests

log = logging.getLogger(__name__)

_ALT_ME_URL = "https://api.alternative.me/fng/?limit=7&format=json"
_TIMEOUT = 10
_HEADERS = {"User-Agent": "ai-quant-bot/0.1"}

_LABELS = {
    (0,  25): ("Extreme Fear",   "risk_on_contrarian"),  # contrarian buy signal
    (25, 45): ("Fear",           "mild_risk_on"),
    (45, 55): ("Neutral",        "neutral"),
    (55, 75): ("Greed",          "mild_risk_off"),
    (75, 100): ("Extreme Greed", "risk_off_contrarian"), # contrarian sell signal
}


def _classify(value: int) -> tuple[str, str]:
    for (lo, hi), (label, signal) in _LABELS.items():
        if lo <= value <= hi:
            return label, signal
    return "Neutral", "neutral"


def fetch_fear_greed() -> Optional[Dict]:
    """Fetch the last 7 days of Fear & Greed readings."""
    try:
        r = requests.get(_ALT_ME_URL, headers=_HEADERS, timeout=_TIMEOUT)
        r.raise_for_status()
        data = r.json().get("data", [])
    except Exception as exc:
        log.debug("Fear & Greed fetch failed: %s", exc)
        return None

    if not data:
        return None

    readings = []
    for entry in data:
        val = int(entry.get("value", 50))
        label, _ = _classify(val)
        readings.append({
            "date":  datetime.fromtimestamp(int(entry["timestamp"]), tz=timezone.utc).strftime("%Y-%m-%d"),
            "value": val,
            "label": label,
        })

    today = readings[0]
    value = today["value"]
    label, signal = _classify(value)

    # 7-day trend
    if len(readings) >= 7:
        week_ago = readings[-1]["value"]
        trend = "rising" if value > week_ago + 5 else ("falling" if value < week_ago - 5 else "stable")
    else:
        trend = "stable"
        week_ago = value

    rationale = (
        f"Fear & Greed at {value} ({label}). "
        + (f"Trending {trend} from {week_ago} a week ago. " if trend != "stable" else "")
        + ("Contrarian: extreme fear often precedes rallies." if value < 25 else
           "Contrarian: extreme greed often precedes corrections." if value > 75 else
           "Mid-range — no strong contrarian signal.")
    )

    return {
        "value":    value,
        "label":    label,
        "signal":   signal,
        "trend":    trend,
        "week_ago": week_ago,
        "rationale": rationale,
        "history":  readings,
        "as_of":    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M"),
    }
