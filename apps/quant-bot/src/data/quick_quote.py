"""Fast single-ticker quote for any tradable instrument via yfinance."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import yfinance as yf

log = logging.getLogger(__name__)

# Common name/alias → yfinance symbol
_ALIASES: Dict[str, str] = {
    # Forex
    "eurusd": "EURUSD=X", "eur/usd": "EURUSD=X", "euro": "EURUSD=X",
    "gbpusd": "GBPUSD=X", "gbp/usd": "GBPUSD=X", "cable": "GBPUSD=X", "pound": "GBPUSD=X",
    "usdjpy": "JPY=X",    "usd/jpy": "JPY=X",    "yen": "JPY=X",
    "usdchf": "CHF=X",    "usd/chf": "CHF=X",    "swissie": "CHF=X",
    "audusd": "AUDUSD=X", "aud/usd": "AUDUSD=X", "aussie": "AUDUSD=X",
    "nzdusd": "NZDUSD=X", "nzd/usd": "NZDUSD=X", "kiwi": "NZDUSD=X",
    "usdcad": "CAD=X",    "usd/cad": "CAD=X",    "loonie": "CAD=X",
    "dxy": "DX-Y.NYB",    "dollar index": "DX-Y.NYB",
    "usdkes": "KES=X",    "usd/kes": "KES=X",    "kenyan shilling": "KES=X",
    "usdtzs": "TZS=X",    "usd/tzs": "TZS=X",
    "usdugx": "UGX=X",    "usd/ugx": "UGX=X",

    # Commodities
    "gold": "GC=F",  "xau": "GC=F",   "xauusd": "GC=F",
    "silver": "SI=F", "xag": "SI=F",   "xagusd": "SI=F",
    "oil": "CL=F",   "crude": "CL=F", "wti": "CL=F",  "crude oil": "CL=F",
    "brent": "BZ=F",
    "natgas": "NG=F", "natural gas": "NG=F",
    "copper": "HG=F",
    "wheat": "ZW=F",
    "corn": "ZC=F",
    "platinum": "PL=F",

    # Crypto
    "btc": "BTC-USD",  "bitcoin": "BTC-USD",
    "eth": "ETH-USD",  "ethereum": "ETH-USD",
    "bnb": "BNB-USD",
    "sol": "SOL-USD",  "solana": "SOL-USD",
    "xrp": "XRP-USD",  "ripple": "XRP-USD",
    "ada": "ADA-USD",  "cardano": "ADA-USD",
    "doge": "DOGE-USD","dogecoin": "DOGE-USD",
    "avax": "AVAX-USD","avalanche": "AVAX-USD",

    # Indices
    "sp500": "^GSPC",  "s&p": "^GSPC",     "s&p 500": "^GSPC",
    "nasdaq": "^IXIC", "nasdaq100": "^NDX",
    "dow": "^DJI",     "dow jones": "^DJI",
    "vix": "^VIX",
    "ftse": "^FTSE",   "ftse100": "^FTSE",
    "dax": "^GDAXI",
    "nikkei": "^N225",
}


def resolve_ticker(raw: str) -> str:
    """Convert user input to a yfinance symbol."""
    key = raw.strip().lower()
    return _ALIASES.get(key, raw.strip().upper())


def get_quote(raw_ticker: str) -> Optional[Dict[str, Any]]:
    """Return a rich quote dict for any symbol. Returns None if not found."""
    symbol = resolve_ticker(raw_ticker)
    try:
        tk = yf.Ticker(symbol)
        hist = tk.history(period="5d", auto_adjust=True)
        if hist.empty:
            return None

        closes = hist["Close"].dropna()
        last = float(closes.iloc[-1])
        prev = float(closes.iloc[-2]) if len(closes) >= 2 else last
        chg_1d = last - prev
        chg_1d_pct = chg_1d / prev * 100 if prev else 0

        week_ago = float(closes.iloc[0]) if len(closes) >= 5 else prev
        chg_1w_pct = (last - week_ago) / week_ago * 100 if week_ago else 0

        info = tk.info or {}
        name = info.get("longName") or info.get("shortName") or symbol
        currency = info.get("currency", "")
        market_cap = info.get("marketCap")
        week52_high = info.get("fiftyTwoWeekHigh")
        week52_low = info.get("fiftyTwoWeekLow")

        return {
            "symbol": symbol,
            "display": raw_ticker.upper(),
            "name": name,
            "last": round(last, 5 if "=" in symbol else 2),
            "chg_1d": round(chg_1d, 5 if "=" in symbol else 2),
            "chg_1d_pct": round(chg_1d_pct, 2),
            "chg_1w_pct": round(chg_1w_pct, 2),
            "currency": currency,
            "market_cap": market_cap,
            "week52_high": week52_high,
            "week52_low": week52_low,
        }
    except Exception as exc:
        log.debug("Quote failed for %s: %s", symbol, exc)
        return None


def format_quote(q: Dict[str, Any]) -> str:
    """Format a quote dict into a readable Telegram message."""
    arrow = "+" if q["chg_1d_pct"] >= 0 else ""
    lines = [
        f"*{q['display']}* — {q['name']}",
        f"Price: {q['last']} {q['currency']}",
        f"1d: {arrow}{q['chg_1d_pct']:.2f}%  |  1w: {'+' if q['chg_1w_pct']>=0 else ''}{q['chg_1w_pct']:.2f}%",
    ]
    if q.get("week52_high") and q.get("week52_low"):
        lines.append(f"52w range: {q['week52_low']} — {q['week52_high']}")
    if q.get("market_cap"):
        mc = q["market_cap"]
        mc_str = f"${mc/1e12:.2f}T" if mc >= 1e12 else f"${mc/1e9:.1f}B"
        lines.append(f"Market cap: {mc_str}")
    return "\n".join(lines)
