"""ETF holdings intelligence — top holdings, AUM, NAV premium/discount for all tracked ETFs.

Data sources:
  - Holdings: stockanalysis.com (free, server-rendered HTML, no auth required)
  - AUM / NAV / price: yfinance Ticker.info (totalAssets, navPrice, regularMarketPrice)

Cached daily in etf_holdings_snapshot table to avoid re-scraping on same-day reruns.
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests
import yfinance as yf
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
_SCRAPE_SLEEP = 0.8   # seconds between requests — be polite
_TOP_N = 5            # holdings stored in payload/dashboard (full list in DB)


# ── Web scraping ──────────────────────────────────────────────────────────────

def _fetch_holdings_web(ticker: str) -> List[Dict]:
    """Scrape top holdings from stockanalysis.com. Returns list of {name, symbol, weight_pct}."""
    url = f"https://stockanalysis.com/etf/{ticker.lower()}/holdings/"
    try:
        r = requests.get(url, headers=_HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as exc:
        log.debug("Holdings fetch failed for %s: %s", ticker, exc)
        return []

    soup = BeautifulSoup(r.text, "html.parser")
    tables = soup.find_all("table")
    if not tables:
        log.debug("No table found for %s", ticker)
        return []

    holdings = []
    for row in tables[0].find_all("tr")[1:]:  # skip header
        cells = [td.get_text(strip=True) for td in row.find_all("td")]
        if len(cells) < 4:
            continue
        symbol = cells[1]
        name   = cells[2]
        weight_str = cells[3].replace("%", "").strip()
        try:
            weight_pct = float(weight_str)
        except ValueError:
            continue
        holdings.append({"symbol": symbol, "name": name, "weight_pct": weight_pct})

    return holdings


# ── yfinance stats ────────────────────────────────────────────────────────────

def _fetch_etf_stats_yf(ticker: str) -> Dict:
    """Return aum_m, nav, price, premium_pct from yfinance."""
    try:
        info = yf.Ticker(ticker).info
    except Exception as exc:
        log.debug("yfinance info failed for %s: %s", ticker, exc)
        return {}

    total_assets = info.get("totalAssets") or info.get("netAssets")
    nav   = info.get("navPrice")
    price = info.get("regularMarketPrice") or info.get("previousClose")

    aum_m = round(total_assets / 1e6, 1) if total_assets else None
    premium_pct = None
    if nav and nav > 0 and price:
        premium_pct = round((price / nav - 1) * 100, 3)

    return {
        "aum_m":       aum_m,
        "nav":         round(nav, 4) if nav else None,
        "price":       round(price, 4) if price else None,
        "premium_pct": premium_pct,
    }


# ── DB helpers ────────────────────────────────────────────────────────────────

def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _load_cached(conn, ticker: str, date: str) -> Optional[Dict]:
    """Return today's cached snapshot for ticker, or None."""
    row = conn.execute(
        "SELECT holdings_json, aum_m, nav, price, premium_pct, n_holdings "
        "FROM etf_holdings_snapshot WHERE ticker=? AND snapshot_date=?",
        (ticker, date),
    ).fetchone()
    if row is None:
        return None
    return {
        "top_holdings_full": json.loads(row[0]),
        "aum_m":       row[1],
        "nav":         row[2],
        "price":       row[3],
        "premium_pct": row[4],
        "n_holdings":  row[5],
    }


def _load_previous_aum(conn, ticker: str, today: str) -> Optional[float]:
    """Return most recent aum_m before today for week-over-week comparison."""
    row = conn.execute(
        "SELECT aum_m FROM etf_holdings_snapshot "
        "WHERE ticker=? AND snapshot_date < ? AND aum_m IS NOT NULL "
        "ORDER BY snapshot_date DESC LIMIT 1",
        (ticker, today),
    ).fetchone()
    return row[0] if row else None


def _save_snapshot(conn, ticker: str, date: str, holdings: List[Dict], stats: Dict) -> None:
    conn.execute(
        """INSERT OR REPLACE INTO etf_holdings_snapshot
           (ticker, snapshot_date, holdings_json, aum_m, nav, price, premium_pct, n_holdings, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            ticker, date,
            json.dumps(holdings),
            stats.get("aum_m"),
            stats.get("nav"),
            stats.get("price"),
            stats.get("premium_pct"),
            len(holdings),
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()


# ── Signal helpers ────────────────────────────────────────────────────────────

def _aum_signal(aum_m: Optional[float], prev_aum_m: Optional[float]) -> tuple:
    if aum_m is None or prev_aum_m is None or prev_aum_m == 0:
        return None, "stable"
    chg = (aum_m / prev_aum_m - 1) * 100
    if chg > 3.0:
        sig = "inflow"
    elif chg < -3.0:
        sig = "outflow"
    else:
        sig = "stable"
    return round(chg, 2), sig


def _premium_signal(pct: Optional[float]) -> str:
    if pct is None:
        return "neutral"
    if pct > 0.3:
        return "premium"
    if pct < -0.3:
        return "discount"
    return "neutral"


# ── Main public function ──────────────────────────────────────────────────────

def gather_etf_holdings(tickers: List[str], conn) -> List[Dict]:
    """Fetch holdings + stats for all ETFs. Returns list of result dicts.

    Uses DB cache — only scrapes if today's data not already stored.
    Sequential with 0.8s sleep between scrapes to avoid rate-limiting.
    """
    today = _today()
    results: List[Dict] = []
    need_scrape: List[str] = []

    # Split: cached vs needs scraping
    cached_results: Dict[str, Dict] = {}
    for tk in tickers:
        cached = _load_cached(conn, tk, today)
        if cached:
            cached_results[tk] = cached
        else:
            need_scrape.append(tk)

    log.info("ETF holdings: %d cached, %d to scrape", len(cached_results), len(need_scrape))

    # Scrape missing ones sequentially
    for i, tk in enumerate(need_scrape):
        if i > 0:
            time.sleep(_SCRAPE_SLEEP)

        holdings = _fetch_holdings_web(tk)
        stats    = _fetch_etf_stats_yf(tk)

        if not holdings and not stats:
            log.debug("No data for %s — skipping", tk)
            continue

        if holdings:
            _save_snapshot(conn, tk, today, holdings, stats)
        cached_results[tk] = {
            "top_holdings_full": holdings,
            **stats,
            "n_holdings": len(holdings),
        }

    # Build output dicts
    for tk in tickers:
        raw = cached_results.get(tk)
        if not raw:
            continue

        prev_aum = _load_previous_aum(conn, tk, today)
        aum_chg, aum_sig = _aum_signal(raw.get("aum_m"), prev_aum)
        prem_sig = _premium_signal(raw.get("premium_pct"))

        full_holdings = raw.get("top_holdings_full", [])

        results.append({
            "ticker":          tk,
            "aum_m":           raw.get("aum_m"),
            "nav":             raw.get("nav"),
            "price":           raw.get("price"),
            "premium_pct":     raw.get("premium_pct"),
            "n_holdings":      raw.get("n_holdings") or len(full_holdings),
            "top_holdings":    full_holdings[:_TOP_N],
            "aum_change_pct":  aum_chg,
            "aum_signal":      aum_sig,
            "premium_signal":  prem_sig,
            "error":           False,
        })

    log.info("ETF holdings: %d ETFs processed", len(results))
    return results
