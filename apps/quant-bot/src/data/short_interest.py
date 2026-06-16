"""Short interest data via yfinance — free, no extra API key needed."""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

import yfinance as yf

log = logging.getLogger(__name__)

_MAX_TICKERS = 20  # cap to keep runtime reasonable


def _fetch_one(ticker: str) -> Dict[str, Any] | None:
    try:
        info = yf.Ticker(ticker).info
        short_pct = info.get("shortPercentOfFloat")
        if short_pct is None:
            return None
        days_to_cover = info.get("shortRatio")
        shares_short = info.get("sharesShort")
        prev_short = info.get("sharesShortPriorMonth")

        # month-over-month change
        mom_chg = None
        if shares_short and prev_short and prev_short > 0:
            mom_chg = round((shares_short - prev_short) / prev_short * 100, 1)

        pct = round(short_pct * 100, 1)
        signal = (
            "squeeze_risk" if pct > 15 else
            "elevated"     if pct > 8  else
            "normal"
        )
        return {
            "ticker": ticker,
            "short_pct_float": pct,
            "days_to_cover": round(days_to_cover, 1) if days_to_cover else None,
            "mom_change_pct": mom_chg,
            "signal": signal,
        }
    except Exception as exc:
        log.debug("Short interest skipped for %s: %s", ticker, exc)
        return None


def gather_short_interest(tickers: List[str]) -> List[Dict[str, Any]]:
    """Fetch short interest for up to _MAX_TICKERS, sorted by short % descending."""
    sample = tickers[:_MAX_TICKERS]
    results: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(_fetch_one, tk): tk for tk in sample}
        for fut in as_completed(futures):
            r = fut.result()
            if r:
                results.append(r)

    results.sort(key=lambda x: x["short_pct_float"], reverse=True)
    log.info("Short interest: %d tickers fetched", len(results))
    return results
