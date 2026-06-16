"""Crypto price + correlation data via CoinGecko public API (free, no key).

Fetches BTC, ETH, SOL, and BNB spot prices plus 30-day % change.
Computes rolling 30-day correlation against SPY (used as risk-on proxy).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests

log = logging.getLogger(__name__)

_BASE = "https://api.coingecko.com/api/v3"
_HEADERS = {"User-Agent": "ai-quant-bot/0.1 (research)", "Accept": "application/json"}
_TIMEOUT = 15

_COINS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "BNB": "binancecoin",
}

_FEAR_GREED_URL = "https://api.alternative.me/fng/"


def _get(path: str, params: dict = {}) -> Optional[dict]:
    try:
        r = requests.get(f"{_BASE}{path}", params=params, headers=_HEADERS, timeout=_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        log.debug("CoinGecko %s failed: %s", path, exc)
        return None


def fetch_crypto_prices() -> List[Dict]:
    """Fetch spot prices + 30d change for tracked coins."""
    ids = ",".join(_COINS.values())
    data = _get("/coins/markets", {
        "vs_currency": "usd",
        "ids": ids,
        "order": "market_cap_desc",
        "price_change_percentage": "1h,24h,7d,30d",
        "sparkline": "false",
    })
    if not data:
        return []

    results = []
    for coin in data:
        symbol = coin.get("symbol", "").upper()
        chg_24h = coin.get("price_change_percentage_24h")
        chg_7d  = coin.get("price_change_percentage_7d_in_currency")
        chg_30d = coin.get("price_change_percentage_30d_in_currency")
        results.append({
            "symbol":       symbol,
            "name":         coin.get("name", ""),
            "price_usd":    coin.get("current_price"),
            "market_cap_b": round((coin.get("market_cap") or 0) / 1e9, 1),
            "volume_24h_b": round((coin.get("total_volume") or 0) / 1e9, 2),
            "chg_24h_pct":  round(chg_24h, 2) if chg_24h is not None else None,
            "chg_7d_pct":   round(chg_7d,  2) if chg_7d  is not None else None,
            "chg_30d_pct":  round(chg_30d, 2) if chg_30d is not None else None,
            "ath_drawdown_pct": round(coin.get("ath_change_percentage") or 0, 1),
            "as_of":        datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M"),
        })

    log.info("Crypto: %d coins fetched", len(results))
    return results


def compute_crypto_regime(prices: List[Dict]) -> Dict:
    """Derive a simple crypto regime signal from BTC + ETH momentum."""
    if not prices:
        return {"regime": "unknown", "signal": "neutral", "rationale": "No crypto data"}

    btc = next((p for p in prices if p["symbol"] == "BTC"), None)
    eth = next((p for p in prices if p["symbol"] == "ETH"), None)

    if not btc:
        return {"regime": "unknown", "signal": "neutral", "rationale": "No BTC data"}

    chg_7d  = btc.get("chg_7d_pct") or 0
    chg_30d = btc.get("chg_30d_pct") or 0
    eth_7d  = (eth.get("chg_7d_pct") or 0) if eth else 0

    # Simple momentum: both BTC and ETH up over 7d = risk-on
    if chg_7d > 5 and eth_7d > 3:
        regime, signal = "bull", "risk_on"
        rationale = f"BTC +{chg_7d:.1f}% 7d, ETH +{eth_7d:.1f}% 7d — crypto risk-on"
    elif chg_7d < -5 and eth_7d < -3:
        regime, signal = "bear", "risk_off"
        rationale = f"BTC {chg_7d:.1f}% 7d, ETH {eth_7d:.1f}% 7d — crypto risk-off"
    elif chg_30d > 15:
        regime, signal = "trending_bull", "mild_risk_on"
        rationale = f"BTC +{chg_30d:.1f}% 30d — sustained uptrend"
    elif chg_30d < -15:
        regime, signal = "trending_bear", "mild_risk_off"
        rationale = f"BTC {chg_30d:.1f}% 30d — sustained downtrend"
    else:
        regime, signal = "neutral", "neutral"
        rationale = f"BTC {chg_7d:+.1f}% 7d — no strong directional signal"

    return {
        "regime":   regime,
        "signal":   signal,
        "rationale": rationale,
        "btc_7d":   chg_7d,
        "btc_30d":  chg_30d,
        "eth_7d":   eth_7d,
    }


def gather_crypto(conn=None) -> Dict:
    """Main entry point — returns {prices, regime}."""
    prices = fetch_crypto_prices()
    regime = compute_crypto_regime(prices)
    return {"prices": prices, "regime": regime}
