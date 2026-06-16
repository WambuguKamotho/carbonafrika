"""Upcoming earnings dates for tracked tickers via yfinance."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List

import yfinance as yf

log = logging.getLogger(__name__)


def gather_earnings_calendar(tickers: List[str], days_ahead: int = 14) -> List[Dict]:
    """Return tickers with earnings expected within `days_ahead` days."""
    cutoff = datetime.now(timezone.utc) + timedelta(days=days_ahead)
    upcoming = []

    for tk in tickers:
        try:
            info = yf.Ticker(tk).calendar
            if info is None or info.empty:
                continue
            # calendar is a DataFrame with columns as dates, rows as metrics
            # Earnings Date is typically in the columns
            if "Earnings Date" in info.index:
                dates = info.loc["Earnings Date"]
                for d in (dates if hasattr(dates, "__iter__") else [dates]):
                    try:
                        if hasattr(d, "to_pydatetime"):
                            d = d.to_pydatetime()
                        if hasattr(d, "tzinfo") and d.tzinfo is None:
                            d = d.replace(tzinfo=timezone.utc)
                        if datetime.now(timezone.utc) <= d <= cutoff:
                            upcoming.append({"ticker": tk, "earnings_date": str(d.date())})
                            break
                    except Exception:
                        continue
        except Exception as exc:
            log.debug("Earnings calendar fetch failed for %s: %s", tk, exc)

    log.info("Earnings calendar: %d tickers reporting in next %d days", len(upcoming), days_ahead)
    return upcoming
