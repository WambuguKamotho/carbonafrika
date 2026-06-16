"""Upcoming macro events calendar — FOMC, CPI, NFP, GDP.

Dates are published well in advance by the Fed, BLS, and BEA.
Hardcoded for 2026; update annually.
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any, Dict, List

log = logging.getLogger(__name__)

# FOMC announcement dates (end of 2-day meeting, ~2 PM ET)
FOMC_DATES = [
    "2026-01-29", "2026-03-19", "2026-05-07",
    "2026-06-18", "2026-07-30", "2026-09-17",
    "2026-10-29", "2026-12-10",
]

# BLS CPI release dates (~8:30 AM ET)
CPI_DATES = [
    "2026-01-14", "2026-02-11", "2026-03-11",
    "2026-04-10", "2026-05-12", "2026-06-11",
    "2026-07-10", "2026-08-12", "2026-09-11",
    "2026-10-14", "2026-11-12", "2026-12-10",
]

# BLS Non-Farm Payrolls — first Friday of each month (~8:30 AM ET)
NFP_DATES = [
    "2026-01-09", "2026-02-06", "2026-03-06",
    "2026-04-03", "2026-05-08", "2026-06-05",
    "2026-07-02", "2026-08-07", "2026-09-04",
    "2026-10-02", "2026-11-06", "2026-12-04",
]

# BEA GDP Advance Estimate (quarterly)
GDP_DATES = [
    "2026-01-29", "2026-04-29", "2026-07-29", "2026-10-28",
]

_CALENDAR = (
    [(d, "FOMC Rate Decision", "high") for d in FOMC_DATES] +
    [(d, "CPI Inflation Report", "high") for d in CPI_DATES] +
    [(d, "Non-Farm Payrolls", "high") for d in NFP_DATES] +
    [(d, "GDP Advance Estimate", "medium") for d in GDP_DATES]
)


def gather_macro_events(days_ahead: int = 21) -> List[Dict[str, Any]]:
    """Return upcoming macro events within the next `days_ahead` days, sorted by date."""
    today = date.today()
    events: List[Dict[str, Any]] = []

    for d_str, event, importance in _CALENDAR:
        try:
            dt = date.fromisoformat(d_str)
        except ValueError:
            continue
        delta = (dt - today).days
        if 0 <= delta <= days_ahead:
            events.append({
                "date": d_str,
                "event": event,
                "importance": importance,
                "days_away": delta,
            })

    events.sort(key=lambda x: x["date"])
    log.info("Macro events: %d upcoming in next %d days", len(events), days_ahead)
    return events
