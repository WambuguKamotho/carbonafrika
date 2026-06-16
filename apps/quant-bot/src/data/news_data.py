"""News ingestion: free RSS by default, NewsAPI if key present."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List

import feedparser
import requests

log = logging.getLogger(__name__)

NEWSAPI_URL = "https://newsapi.org/v2/everything"


def fetch_rss_headlines(feeds: List[str], max_per_feed: int = 20) -> List[Dict]:
    """Pull recent headlines from a list of RSS URLs."""
    out: List[Dict] = []
    for url in feeds:
        try:
            parsed = feedparser.parse(url)
            for entry in parsed.entries[:max_per_feed]:
                published = (
                    entry.get("published")
                    or entry.get("updated")
                    or datetime.utcnow().isoformat()
                )
                out.append({
                    "title": entry.get("title", "").strip(),
                    "summary": (entry.get("summary") or "").strip()[:400],
                    "source": parsed.feed.get("title", url),
                    "url": entry.get("link", ""),
                    "published": str(published),
                })
        except Exception as exc:  # noqa: BLE001
            log.warning("RSS feed failed %s: %s", url, exc)
    log.info("Pulled %d RSS headlines", len(out))
    return out


def filter_by_keywords(headlines: List[Dict], keywords: List[str]) -> List[Dict]:
    """Case-insensitive keyword filter on title+summary."""
    kws = [k.lower() for k in keywords]
    matched = []
    for h in headlines:
        blob = (h.get("title", "") + " " + h.get("summary", "")).lower()
        if any(k in blob for k in kws):
            matched.append(h)
    return matched


def fetch_newsapi(keywords: List[str], api_key: str, days_back: int = 2, page_size: int = 20) -> List[Dict]:
    """Optional richer news via NewsAPI."""
    if not api_key or not keywords:
        return []
    since = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    query = " OR ".join(f'"{k}"' for k in keywords)
    try:
        resp = requests.get(
            NEWSAPI_URL,
            params={
                "q": query,
                "from": since,
                "sortBy": "publishedAt",
                "language": "en",
                "pageSize": page_size,
                "apiKey": api_key,
            },
            timeout=15,
        )
        resp.raise_for_status()
        articles = resp.json().get("articles", [])
        return [
            {
                "title": a.get("title", ""),
                "summary": (a.get("description") or "")[:400],
                "source": (a.get("source") or {}).get("name", "NewsAPI"),
                "url": a.get("url", ""),
                "published": a.get("publishedAt", ""),
            }
            for a in articles
        ]
    except Exception as exc:  # noqa: BLE001
        log.warning("NewsAPI request failed: %s", exc)
        return []


def gather_sector_news(
    sector_keywords: Dict[str, List[str]],
    rss_feeds: List[str],
    newsapi_key: str,
    max_per_sector: int = 8,
) -> Dict[str, List[Dict]]:
    """For each sector return up to N headlines from RSS+NewsAPI combined."""
    rss_pool = fetch_rss_headlines(rss_feeds)
    out: Dict[str, List[Dict]] = {}
    for sector, kws in sector_keywords.items():
        bucket: List[Dict] = []
        bucket.extend(filter_by_keywords(rss_pool, kws))
        if newsapi_key:
            bucket.extend(fetch_newsapi(kws, newsapi_key, page_size=10))
        # de-dupe by URL
        seen = set()
        deduped: List[Dict] = []
        for h in bucket:
            u = h.get("url") or h.get("title")
            if u in seen:
                continue
            seen.add(u)
            deduped.append(h)
        out[sector] = deduped[:max_per_sector]
    return out
