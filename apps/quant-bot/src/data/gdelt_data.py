"""GDELT 2.0 — global news tone and theme-tagged events.

Two endpoints used:
  - DOC API: full-text article search with tone scoring
    https://api.gdeltproject.org/api/v2/doc/doc
  - GeoJSON timeline: not used (high volume); doc endpoint is sufficient for daily briefs.

GDELT themes worth watching for trade:
  ECON_TRADE, ECON_BANKRUPTCY, GENERAL_GOVERNMENT, PROTEST, SANCTIONS,
  NATURAL_DISASTER, ENERGY_RENEWABLE, MIL_SELFIDENTIFIEDARMS, EPU_CATS_MIGRATION
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List

import requests

log = logging.getLogger(__name__)

GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
HEADERS = {"User-Agent": "ai-quant-bot/0.1 (research)"}


def fetch_theme_articles(theme: str, hours_back: int = 24, max_records: int = 25) -> List[Dict]:
    """Pull recent English articles tagged with a GDELT theme, with tone scores."""
    since = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).strftime("%Y%m%d%H%M%S")
    params = {
        "query": f'theme:{theme} sourcelang:eng',
        "mode": "ArtList",
        "format": "json",
        "maxrecords": max_records,
        "startdatetime": since,
        "sort": "DateDesc",
    }
    try:
        r = requests.get(GDELT_DOC_URL, params=params, headers=HEADERS, timeout=5)
        r.raise_for_status()
        # GDELT sometimes returns text/html with empty body when no results
        if not r.text.strip().startswith("{"):
            return []
        articles = r.json().get("articles", [])
        return [
            {
                "title": a.get("title", "").strip(),
                "url": a.get("url"),
                "domain": a.get("domain"),
                "language": a.get("language"),
                "country": a.get("sourcecountry"),
                "seen_at": a.get("seendate"),
                "tone": a.get("tone"),  # often missing on ArtList; included if present
            }
            for a in articles
            if a.get("title")
        ]
    except Exception as exc:  # noqa: BLE001
        log.warning("GDELT theme fetch failed for %s: %s", theme, exc)
        return []


def fetch_tone_timeline(theme: str, hours_back: int = 24) -> Dict[str, float]:
    """Aggregated average tone for a theme over the window (single-number summary)."""
    since = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).strftime("%Y%m%d%H%M%S")
    params = {
        "query": f'theme:{theme} sourcelang:eng',
        "mode": "TimelineTone",
        "format": "json",
        "startdatetime": since,
    }
    try:
        r = requests.get(GDELT_DOC_URL, params=params, headers=HEADERS, timeout=5)
        r.raise_for_status()
        if not r.text.strip().startswith("{"):
            return {}
        data = r.json()
        timeline = (data.get("timeline") or [{}])[0].get("data", [])
        if not timeline:
            return {}
        tones = [pt.get("value") for pt in timeline if pt.get("value") is not None]
        if not tones:
            return {}
        return {
            "theme": theme,
            "avg_tone": round(sum(tones) / len(tones), 3),
            "min_tone": round(min(tones), 3),
            "max_tone": round(max(tones), 3),
            "n_buckets": len(tones),
        }
    except Exception as exc:  # noqa: BLE001
        log.warning("GDELT tone timeline failed for %s: %s", theme, exc)
        return {}


DEFAULT_THEMES = [
    "ECON_TRADE",
    "ECON_BANKRUPTCY",
    "ECON_INTEREST_RATES",
    "PROTEST",
    "SANCTIONS",
    "NATURAL_DISASTER",
    "ENERGY_RENEWABLE",
    "GENERAL_GOVERNMENT",
]


def gather_gdelt(themes: List[str] | None = None,
                 hours_back: int = 24,
                 max_articles_per_theme: int = 5) -> Dict[str, Dict]:
    """Return tone summary + top articles per theme."""
    themes = themes or DEFAULT_THEMES
    out: Dict[str, Dict] = {}
    for t in themes:
        tone = fetch_tone_timeline(t, hours_back=hours_back)
        articles = fetch_theme_articles(t, hours_back=hours_back, max_records=max_articles_per_theme)
        out[t] = {
            "tone": tone,
            "articles": [
                {"title": a["title"], "domain": a["domain"], "country": a.get("country"),
                 "seen_at": a.get("seen_at")}
                for a in articles
            ],
        }
    log.info("GDELT pulled %d themes", len(out))
    return out
