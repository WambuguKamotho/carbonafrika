"""CBOE volatility sentiment gauges via yfinance.

Uses CBOE indices available on Yahoo Finance:
  ^VIX   — spot volatility (fear gauge, 0–100+)
  ^VIX3M — 3-month VIX
  ^SKEW  — tail-risk skew index (100=normal, 145+=elevated put buying)
  ^VXN   — Nasdaq volatility index

Put/call signal is derived from VIX level + SKEW since the CBOE P/C CSV
is not publicly accessible without a browser session.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, Optional

log = logging.getLogger(__name__)

_SYMBOLS = {
    "vix":   "^VIX",
    "vix3m": "^VIX3M",
    "skew":  "^SKEW",
    "vxn":   "^VXN",
}


def _fetch_latest(sym: str) -> Optional[float]:
    try:
        import yfinance as yf
        h = yf.Ticker(sym).history(period="5d")
        if not h.empty:
            return round(float(h["Close"].dropna().iloc[-1]), 2)
    except Exception as exc:
        log.debug("yfinance %s failed: %s", sym, exc)
    return None


def gather_cboe(conn=None) -> Optional[Dict]:
    """Fetch CBOE volatility indices and derive a market sentiment signal."""
    vix   = _fetch_latest("^VIX")
    vix3m = _fetch_latest("^VIX3M")
    skew  = _fetch_latest("^SKEW")
    vxn   = _fetch_latest("^VXN")

    if vix is None:
        log.debug("CBOE: no VIX data")
        return None

    # Term structure: VIX3M - VIX  (positive = contango = calm, negative = backwardation = fear)
    term_structure = round(vix3m - vix, 2) if vix3m else None

    # Signal from VIX level
    if vix >= 30:
        signal, label = "extreme_fear",  "VIX ≥30 — extreme fear / potential buy signal"
    elif vix >= 20:
        signal, label = "elevated_fear", "VIX 20–30 — elevated fear / caution"
    elif vix <= 13:
        signal, label = "complacency",   "VIX ≤13 — complacency / potential sell signal"
    else:
        signal, label = "neutral",       "VIX 13–20 — normal volatility range"

    # SKEW enrichment
    skew_note = ""
    if skew:
        if skew >= 140:
            skew_note = f" SKEW {skew} (elevated tail-risk hedging — puts in demand)."
        elif skew <= 115:
            skew_note = f" SKEW {skew} (low tail-risk concern)."
        else:
            skew_note = f" SKEW {skew} (normal)."

    result = {
        "vix":            vix,
        "vix3m":          vix3m,
        "vxn":            vxn,
        "skew":           skew,
        "term_structure": term_structure,
        "signal":         signal,
        "interpretation": label + skew_note,
        "equity_pc":      None,   # kept for dashboard compatibility
        "avg_5d":         None,
        "date":           datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "as_of":          datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M"),
    }

    log.info("CBOE: VIX=%.1f SKEW=%s (%s)", vix, skew, signal)
    return result
