"""Macro data cache — FRED, EIA, World Bank, COT with TTL."""
from __future__ import annotations

import logging
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List

import pandas as pd

log = logging.getLogger(__name__)

TTL = {
    "fred":      24 * 7,    # FRED: weekly updates
    "eia":       24 * 7,
    "worldbank": 24 * 30,   # World Bank: monthly
    "cot":       24 * 7,    # CFTC: weekly
}


def _is_stale(fetched_at: str, ttl_hours: int) -> bool:
    try:
        fetched = datetime.fromisoformat(fetched_at)
        if fetched.tzinfo is None:
            fetched = fetched.replace(tzinfo=timezone.utc)
        age_hours = (datetime.now(timezone.utc) - fetched).total_seconds() / 3600
        return age_hours > ttl_hours
    except Exception:
        return True


def get_cached_macro(conn: sqlite3.Connection, series_id: str) -> List[Dict[str, Any]]:
    """Return cached rows for a series, or [] if stale/missing."""
    rows = conn.execute(
        "SELECT date, value, fetched_at, ttl_hours FROM macro_cache WHERE series_id=? ORDER BY date",
        (series_id,),
    ).fetchall()
    if not rows:
        return []
    # Check if most recent fetch is still fresh
    latest_fetch = max(r["fetched_at"] for r in rows)
    ttl = rows[0]["ttl_hours"] or 24
    if _is_stale(latest_fetch, ttl):
        log.debug("Macro cache stale for %s (ttl=%dh)", series_id, ttl)
        return []
    return [{"date": r["date"], "value": r["value"]} for r in rows]


def store_macro(conn: sqlite3.Connection, series_id: str, records: List[Dict],
                source: str = "fred") -> None:
    now = datetime.now(timezone.utc).isoformat()
    ttl = TTL.get(source, 24)
    conn.executemany(
        "INSERT OR REPLACE INTO macro_cache(series_id,date,value,source,fetched_at,ttl_hours) "
        "VALUES(?,?,?,?,?,?)",
        [(series_id, r["date"], r.get("value"), source, now, ttl) for r in records],
    )
    conn.commit()


def fetch_fred_cached(conn: sqlite3.Connection, series: Dict[str, str],
                       api_key: str) -> pd.DataFrame:
    """Fetch FRED series, using cache when fresh."""
    from src.data.economic_data import fetch_fred_series

    all_cached = True
    for name in series:
        if not get_cached_macro(conn, f"fred:{name}"):
            all_cached = False
            break

    if all_cached:
        log.info("FRED: all series served from cache")
        rows = []
        for name in series:
            cached = get_cached_macro(conn, f"fred:{name}")
            if cached:
                latest = cached[-1]
                prev = cached[-2] if len(cached) > 1 else latest
                yoy_val = cached[-13] if len(cached) >= 13 else cached[0]
                yoy_pct = round((latest["value"] / yoy_val["value"] - 1) * 100, 2) if yoy_val["value"] else None
                rows.append({"name": name, "latest": latest["value"],
                             "yoy_pct": yoy_pct, "as_of": latest["date"]})
        return pd.DataFrame(rows)

    log.info("FRED: cache miss — fetching live")
    df = fetch_fred_series(series, api_key)
    if not df.empty:
        for _, row in df.iterrows():
            store_macro(conn, f"fred:{row['name']}",
                        [{"date": row.get("as_of", ""), "value": row.get("latest")}],
                        source="fred")
    return df
