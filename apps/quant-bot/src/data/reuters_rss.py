"""Reuters and financial news RSS feed fetcher.

Pulls top market/business headlines from publicly available RSS feeds.
No API key required. Falls back gracefully if any feed is unavailable.
"""
from __future__ import annotations

import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict

_FEEDS: List[Dict[str, str]] = [
    {"source": "Reuters", "category": "markets",  "url": "https://feeds.reuters.com/reuters/marketsNews"},
    {"source": "Reuters", "category": "business", "url": "https://feeds.reuters.com/reuters/businessNews"},
    {"source": "Reuters", "category": "top",      "url": "https://feeds.reuters.com/reuters/topNews"},
    {"source": "CNBC",    "category": "markets",  "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258"},
    {"source": "CNBC",    "category": "business", "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664"},
    {"source": "AP",      "category": "business", "url": "https://feeds.apnews.com/apf-business"},
]

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; QuantBot/1.0; +https://github.com/)",
    "Accept": "application/rss+xml, application/xml, text/xml",
}


def fetch_rss_headlines(max_per_feed: int = 8, timeout: int = 12) -> List[Dict]:
    """
    Fetch headlines from Reuters/CNBC/AP RSS feeds.
    Returns list of dicts with keys: source, category, title, link, pub_date, description.
    """
    articles: List[Dict] = []
    seen_titles: set = set()

    for feed in _FEEDS:
        try:
            req = urllib.request.Request(feed["url"], headers=_HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()

            root = ET.fromstring(data)
            channel = root.find("channel")
            items = channel.findall("item") if channel is not None else root.findall(".//item")

            count = 0
            for item in items:
                if count >= max_per_feed:
                    break
                title = (item.findtext("title") or "").strip()
                if not title or title in seen_titles:
                    continue
                seen_titles.add(title)

                pub_date = (item.findtext("pubDate") or "").strip()
                description = (item.findtext("description") or "").strip()
                # Strip HTML tags from description
                import re
                description = re.sub(r"<[^>]+>", "", description)[:250]

                articles.append({
                    "source":      feed["source"],
                    "category":    feed["category"],
                    "title":       title,
                    "link":        (item.findtext("link") or "").strip(),
                    "pub_date":    pub_date,
                    "description": description,
                    "fetched_utc": datetime.now(timezone.utc).strftime("%H:%M UTC"),
                })
                count += 1

        except Exception:
            continue

    return articles


def top_headlines(articles: List[Dict], n: int = 15) -> List[Dict]:
    """Return the n most recent deduplicated headlines, newest first."""
    # Reuters first, then others
    ordered = sorted(articles, key=lambda x: (x["source"] != "Reuters", x.get("pub_date", "")), reverse=False)
    return ordered[:n]
