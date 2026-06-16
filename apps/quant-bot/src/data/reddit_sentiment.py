"""Reddit JSON endpoints — retail sentiment proxy (no auth required).

Just append `.json` to any subreddit URL to get a listing. We need a real
User-Agent (Reddit blocks the default `python-requests/...`).
"""
from __future__ import annotations

import logging
from typing import Dict, List

import requests

log = logging.getLogger(__name__)

HEADERS = {"User-Agent": "ai-quant-bot/0.1 by u/anon (research)"}

DEFAULT_SUBS = ["wallstreetbets", "stocks", "investing", "options", "StockMarket"]


def fetch_subreddit_top(sub: str, listing: str = "hot", limit: int = 15) -> List[Dict]:
    """Return top N posts from a subreddit."""
    url = f"https://www.reddit.com/r/{sub}/{listing}.json"
    try:
        r = requests.get(url, params={"limit": limit}, headers=HEADERS, timeout=15)
        if r.status_code == 429:
            log.warning("Reddit rate-limited on /r/%s", sub)
            return []
        r.raise_for_status()
        children = r.json().get("data", {}).get("children", [])
        out = []
        for c in children:
            d = c.get("data", {})
            if d.get("stickied"):
                continue
            out.append({
                "title": (d.get("title") or "").strip()[:240],
                "score": d.get("score"),
                "comments": d.get("num_comments"),
                "flair": d.get("link_flair_text"),
                "url": "https://www.reddit.com" + (d.get("permalink") or ""),
                "created_utc": d.get("created_utc"),
            })
        return out
    except Exception as exc:  # noqa: BLE001
        log.warning("Reddit fetch failed for /r/%s: %s", sub, exc)
        return []


def gather_reddit(subs: List[str] | None = None, per_sub: int = 10) -> Dict[str, List[Dict]]:
    subs = subs or DEFAULT_SUBS
    out: Dict[str, List[Dict]] = {}
    for s in subs:
        out[s] = fetch_subreddit_top(s, listing="hot", limit=per_sub)
    log.info("Reddit pulled %d subs", len(out))
    return out
