"""VIX spot + term structure via yfinance."""
from __future__ import annotations

import logging
from typing import Dict

import yfinance as yf

log = logging.getLogger(__name__)

# VIX spot + nearest VIX futures (continuous contracts on Yahoo)
VIX_TICKERS = {
    "vix_spot": "^VIX",
    "vix3m": "^VIX3M",    # 3-month VIX
    "move": "^MOVE",       # bond volatility index
}


def gather_vix() -> Dict[str, object]:
    """Return latest VIX spot, VIX3M, MOVE and derived term structure signals."""
    out: Dict[str, object] = {}
    for name, ticker in VIX_TICKERS.items():
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period="5d")
            if hist.empty:
                continue
            last = float(hist["Close"].iloc[-1])
            prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else last
            out[name] = {
                "last": round(last, 2),
                "1d_chg": round(last - prev, 2),
                "1d_pct": round((last / prev - 1) * 100, 2),
            }
        except Exception as exc:
            log.warning("VIX fetch failed for %s: %s", ticker, exc)

    # Term structure signal: VIX3M - VIX spot (positive = contango/calm, negative = backwardation/fear)
    if "vix_spot" in out and "vix3m" in out:
        spread = out["vix3m"]["last"] - out["vix_spot"]["last"]  # type: ignore[index]
        out["term_structure"] = {
            "vix3m_minus_spot": round(spread, 2),
            "signal": "contango" if spread > 0 else "backwardation",
            "note": "backwardation signals near-term fear elevated vs medium-term" if spread < 0 else "normal risk environment",
        }

    log.info("VIX data: %s", {k: v for k, v in out.items() if k != "term_structure"})
    return out
