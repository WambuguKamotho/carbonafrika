"""US Congressional stock trade disclosures (STOCK Act).

Primary: Capitol Trades API (capitoltrades.com) — free, no key, reliable.
Fallback: House/Senate Stock Watcher S3 buckets (often down).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import requests

log = logging.getLogger(__name__)

_HEADERS = {"User-Agent": "ai-quant-bot/0.1 (research)"}
_TIMEOUT = 20

# Capitol Trades public API — paginated, sorted by newest first
_CAPITOL_TRADES_URL = "https://api.capitoltrades.com/trades"

# Fallback S3 sources
_HOUSE_URL   = "https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json"
_SENATE_URL  = "https://senate-stock-watcher-data.s3-us-east-2.amazonaws.com/aggregate/all_transactions.json"


def _parse_date(s: str) -> Optional[datetime]:
    if not s:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s[:10], fmt[:10]).replace(tzinfo=timezone.utc)
        except Exception:
            continue
    return None


def _days_gap(trade_date: str, disclosure_date: str) -> Optional[int]:
    try:
        t = _parse_date(trade_date)
        d = _parse_date(disclosure_date)
        if t and d:
            return max(0, (d - t).days)
    except Exception:
        pass
    return None


# ── Capitol Trades (primary) ──────────────────────────────────────────────────

def _fetch_capitol_trades(days_back: int = 30, limit: int = 100) -> List[Dict]:
    """Fetch from capitoltrades.com API — paginated JSON, no auth required."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    trades: List[Dict] = []
    page = 1

    while len(trades) < limit:
        try:
            r = requests.get(
                _CAPITOL_TRADES_URL,
                params={"page": page, "pageSize": 100, "sortBy": "-pubDate"},
                headers=_HEADERS,
                timeout=_TIMEOUT,
            )
            r.raise_for_status()
            data = r.json()
        except Exception as exc:
            log.debug("Capitol Trades page %d failed: %s", page, exc)
            break

        items = data.get("data", [])
        if not items:
            break

        for item in items:
            pub_date = (item.get("pubDate") or "")[:10]
            if pub_date and pub_date < cutoff:
                return trades  # past cutoff, sorted newest-first so we're done

            ticker = (item.get("asset", {}).get("assetTicker") or "").strip().upper()
            if not ticker or ticker in ("--", "N/A", ""):
                continue

            politician = item.get("politician", {})
            name = f"{politician.get('firstName', '')} {politician.get('lastName', '')}".strip()
            chamber = politician.get("chamber", "")
            party = politician.get("party", "")
            state = politician.get("state", "")
            trade_type = item.get("type", "")
            amount_range = item.get("amount", "")
            if isinstance(amount_range, dict):
                lo = amount_range.get("lo", 0) or 0
                hi = amount_range.get("hi", 0) or 0
                amount_str = f"${lo:,}–${hi:,}" if hi else f"~${lo:,}"
            else:
                amount_str = str(amount_range)

            trade_date = (item.get("txDate") or pub_date or "")[:10]
            trades.append({
                "chamber":          chamber,
                "name":             name,
                "party":            party,
                "state":            state,
                "ticker":           ticker,
                "asset_description": (item.get("asset", {}).get("assetName") or "")[:80],
                "trade_type":       trade_type,
                "amount":           amount_str,
                "trade_date":       trade_date,
                "disclosure_date":  pub_date,
                "days_to_disclose": _days_gap(trade_date, pub_date),
                "source":           "capitoltrades",
            })
            if len(trades) >= limit:
                break

        total_pages = data.get("meta", {}).get("totalPages", 1)
        if page >= total_pages:
            break
        page += 1

    log.info("Capitol Trades: %d trades in last %d days", len(trades), days_back)
    return trades


# ── Stock Watcher fallbacks ───────────────────────────────────────────────────

def _fetch_stockwatcher(url: str, chamber: str, days_back: int) -> List[Dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
    try:
        r = requests.get(url, headers=_HEADERS, timeout=30)
        r.raise_for_status()
        raw = r.json()
    except Exception as exc:
        log.debug("%s Stock Watcher fetch failed: %s", chamber, exc)
        return []

    out = []
    for t in raw:
        disclosure_date = _parse_date(t.get("disclosure_date", ""))
        if disclosure_date and disclosure_date < cutoff:
            continue
        ticker = (t.get("ticker") or "").strip().upper()
        if not ticker or ticker in ("--", "N/A", ""):
            continue
        trade_date = t.get("transaction_date") or t.get("disclosure_date", "")
        name = t.get("representative") or (
            f"{t.get('first_name','')} {t.get('last_name','')}".strip()
        ) or t.get("senator", "Unknown")
        out.append({
            "chamber":          chamber,
            "name":             name,
            "party":            t.get("party", ""),
            "state":            t.get("state", ""),
            "ticker":           ticker,
            "asset_description": (t.get("asset_description") or "")[:80],
            "trade_type":       t.get("type", ""),
            "amount":           t.get("amount", ""),
            "trade_date":       (trade_date or "")[:10],
            "disclosure_date":  (t.get("disclosure_date") or "")[:10],
            "days_to_disclose": _days_gap(trade_date, t.get("disclosure_date", "")),
            "source":           "stockwatcher",
        })
    return out


# ── Public API ────────────────────────────────────────────────────────────────

def gather_congress_trades(days_back: int = 30, limit: int = 100) -> List[Dict]:
    """Fetch congressional disclosures. Uses Capitol Trades, falls back to S3."""
    trades = _fetch_capitol_trades(days_back=days_back, limit=limit)
    if not trades:
        log.info("Capitol Trades empty — trying Stock Watcher fallback")
        trades = (
            _fetch_stockwatcher(_HOUSE_URL,  "House",  days_back) +
            _fetch_stockwatcher(_SENATE_URL, "Senate", days_back)
        )
        trades.sort(key=lambda t: t.get("disclosure_date", ""), reverse=True)

    return trades[:limit]


def summarise_by_ticker(trades: List[Dict]) -> List[Dict]:
    """Aggregate trades by ticker: buy/sell counts, politicians involved."""
    from collections import defaultdict
    agg: Dict[str, Dict] = defaultdict(lambda: {
        "ticker": "", "buys": 0, "sells": 0, "politicians": [], "total_trades": 0
    })
    for t in trades:
        tk = t["ticker"]
        agg[tk]["ticker"] = tk
        agg[tk]["total_trades"] += 1
        trade_type = t.get("trade_type", "").lower()
        if any(w in trade_type for w in ("purchase", "buy", "bought")):
            agg[tk]["buys"] += 1
        elif any(w in trade_type for w in ("sale", "sell", "sold")):
            agg[tk]["sells"] += 1
        name = t.get("name", "")
        if name and name not in agg[tk]["politicians"]:
            agg[tk]["politicians"].append(name)
    result = sorted(agg.values(), key=lambda x: x["total_trades"], reverse=True)
    for r in result:
        r["politicians"] = r["politicians"][:5]
    return result
