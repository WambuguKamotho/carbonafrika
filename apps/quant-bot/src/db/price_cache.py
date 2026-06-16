"""Price cache — fetch only missing dates, store everything in SQLite."""
from __future__ import annotations

import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Iterable, List

import pandas as pd
import yfinance as yf

log = logging.getLogger(__name__)


def _latest_cached_date(conn: sqlite3.Connection, ticker: str) -> str | None:
    row = conn.execute(
        "SELECT MAX(date) FROM prices WHERE ticker=?", (ticker,)
    ).fetchone()
    return row[0] if row and row[0] else None


def _insert_prices(conn: sqlite3.Connection, ticker: str, df: pd.DataFrame) -> int:
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for date, row in df.iterrows():
        date_str = str(date)[:10]
        rows.append((
            ticker, date_str,
            float(row.get("Open", 0) or 0),
            float(row.get("High", 0) or 0),
            float(row.get("Low", 0) or 0),
            float(row.get("Close", 0) or 0),
            float(row.get("Volume", 0) or 0),
            now,
        ))
    conn.executemany(
        "INSERT OR REPLACE INTO prices(ticker,date,open,high,low,close,volume,fetched_at) "
        "VALUES(?,?,?,?,?,?,?,?)",
        rows,
    )
    conn.commit()
    return len(rows)


def fetch_prices_cached(
    conn: sqlite3.Connection,
    tickers: Iterable[str],
    lookback_days: int = 400,
) -> pd.DataFrame:
    """
    Return a wide DataFrame of adjusted close prices (date x ticker).
    Fetches only the gap between the last cached date and today.
    """
    tickers = list(dict.fromkeys(tickers))
    if not tickers:
        return pd.DataFrame()

    today = datetime.now(timezone.utc).date()
    full_start = today - timedelta(days=lookback_days)

    tickers_needing_fetch: List[tuple[str, str]] = []
    for tk in tickers:
        latest = _latest_cached_date(conn, tk)
        if not latest:
            fetch_from = str(full_start)
        else:
            cached_dt = datetime.strptime(latest, "%Y-%m-%d").date()
            if cached_dt >= today:
                continue  # fully up to date
            fetch_from = str(cached_dt + timedelta(days=1))
        tickers_needing_fetch.append((tk, fetch_from))

    # Download missing data in batches of 50
    if tickers_needing_fetch:
        batch_size = 50
        for i in range(0, len(tickers_needing_fetch), batch_size):
            batch = tickers_needing_fetch[i : i + batch_size]
            # Group by fetch_from date to minimise API calls
            by_start: dict[str, list[str]] = {}
            for tk, start in batch:
                by_start.setdefault(start, []).append(tk)

            for start_date, batch_tickers in by_start.items():
                try:
                    log.info("Fetching %d tickers from %s (incremental)", len(batch_tickers), start_date)
                    raw = yf.download(
                        batch_tickers,
                        start=start_date,
                        end=str(today + timedelta(days=1)),
                        auto_adjust=True,
                        progress=False,
                        group_by="ticker",
                        threads=True,
                    )
                    if raw is None or raw.empty:
                        continue
                    for tk in batch_tickers:
                        try:
                            if isinstance(raw.columns, pd.MultiIndex):
                                tkdf = raw[tk].dropna(how="all") if tk in raw.columns.get_level_values(0) else pd.DataFrame()
                            else:
                                tkdf = raw.dropna(how="all")
                            if not tkdf.empty:
                                inserted = _insert_prices(conn, tk, tkdf)
                                log.debug("Cached %d rows for %s", inserted, tk)
                        except Exception as exc:
                            log.warning("Cache insert failed for %s: %s", tk, exc)
                except Exception as exc:
                    log.warning("yfinance batch download failed: %s", exc)

    # Read from cache
    start_str = str(full_start)
    closes: dict[str, pd.Series] = {}
    for tk in tickers:
        rows = conn.execute(
            "SELECT date, close FROM prices WHERE ticker=? AND date>=? ORDER BY date",
            (tk, start_str),
        ).fetchall()
        if rows:
            idx = pd.to_datetime([r[0] for r in rows])
            closes[tk] = pd.Series([r[1] for r in rows], index=idx, name=tk)

    if not closes:
        return pd.DataFrame()
    return pd.DataFrame(closes).sort_index()
