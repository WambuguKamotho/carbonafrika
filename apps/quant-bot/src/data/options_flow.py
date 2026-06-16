"""Options flow — put/call ratios, IV, Greeks, and chain analysis via yfinance."""
from __future__ import annotations

import logging
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

import numpy as np
import yfinance as yf

log = logging.getLogger(__name__)

_MAX_TICKERS = 30
_RISK_FREE_RATE = 0.053  # approximate US 3-month T-bill rate


# ── Black-Scholes Greeks (numpy only, no scipy) ───────────────────────────────

def _norm_cdf(x: float) -> float:
    return float(0.5 * (1 + math.erf(x / math.sqrt(2))))


def _bs_greeks(S: float, K: float, T: float, r: float, sigma: float,
               option_type: str = "call") -> Dict[str, float]:
    """Black-Scholes delta, gamma, theta, vega, rho for a single contract."""
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return {}
    try:
        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)
        nd1 = _norm_cdf(d1)
        nd2 = _norm_cdf(d2)
        phi_d1 = math.exp(-0.5 * d1 ** 2) / math.sqrt(2 * math.pi)

        if option_type == "call":
            delta = nd1
            theta = (-(S * phi_d1 * sigma) / (2 * math.sqrt(T))
                     - r * K * math.exp(-r * T) * nd2) / 365
            rho = K * T * math.exp(-r * T) * nd2 / 100
        else:
            delta = nd1 - 1
            theta = (-(S * phi_d1 * sigma) / (2 * math.sqrt(T))
                     + r * K * math.exp(-r * T) * _norm_cdf(-d2)) / 365
            rho = -K * T * math.exp(-r * T) * _norm_cdf(-d2) / 100

        gamma = phi_d1 / (S * sigma * math.sqrt(T))
        vega = S * phi_d1 * math.sqrt(T) / 100

        return {
            "delta": round(delta, 4),
            "gamma": round(gamma, 6),
            "theta": round(theta, 4),
            "vega": round(vega, 4),
            "rho": round(rho, 4),
        }
    except Exception:
        return {}


# ── IV rank helpers ───────────────────────────────────────────────────────────

def _iv_rank(current_iv: float, hist_iv: List[float]) -> Optional[float]:
    """IV Rank: where current IV sits in the 52-week range (0-100)."""
    if not hist_iv or len(hist_iv) < 10:
        return None
    lo, hi = min(hist_iv), max(hist_iv)
    if hi == lo:
        return 50.0
    return round((current_iv - lo) / (hi - lo) * 100, 1)


def _iv_percentile(current_iv: float, hist_iv: List[float]) -> Optional[float]:
    """IV Percentile: % of days current IV was lower over past year."""
    if not hist_iv or len(hist_iv) < 10:
        return None
    below = sum(1 for v in hist_iv if v < current_iv)
    return round(below / len(hist_iv) * 100, 1)


# ── Strategy recommendation ───────────────────────────────────────────────────

def _recommend_strategy(iv_rank: Optional[float], iv_pct: Optional[float],
                        pc_ratio: float, trend: str,
                        earnings_soon: bool) -> Dict[str, str]:
    """Rule-based options strategy recommendation."""
    ivr = iv_rank or 50
    strategies = []

    if earnings_soon:
        if ivr > 60:
            strategies.append({
                "strategy": "Short Straddle / Iron Condor",
                "rationale": "IV elevated into earnings — sell premium, profit if move is smaller than priced.",
                "risk": "Unlimited loss on straddle if move is large. Use iron condor to cap risk.",
            })
        else:
            strategies.append({
                "strategy": "Long Straddle / Strangle",
                "rationale": "IV cheap ahead of catalyst — buy vol, profit from large move in either direction.",
                "risk": "Lose full premium if stock doesn't move.",
            })
    elif ivr > 70:
        if trend == "bullish":
            strategies.append({
                "strategy": "Covered Call / Bull Put Spread",
                "rationale": "High IV + uptrend: sell OTM calls against longs, or sell put spread for income.",
                "risk": "Caps upside on covered call. Put spread loses max if stock falls through short strike.",
            })
        elif trend == "bearish":
            strategies.append({
                "strategy": "Bear Call Spread",
                "rationale": "High IV + downtrend: sell call spread to profit from continued weakness.",
                "risk": "Max loss is width of spread minus premium received.",
            })
        else:
            strategies.append({
                "strategy": "Iron Condor",
                "rationale": "High IV + sideways price action: sell OTM call spread + put spread. Profit from IV crush.",
                "risk": "Loss if stock breaks outside the wings.",
            })
    elif ivr < 30:
        if pc_ratio > 1.2:
            strategies.append({
                "strategy": "Long Call / Bull Call Spread",
                "rationale": "Low IV + bearish sentiment (high P/C) = contrarian long. Cheap calls to buy the dip.",
                "risk": "Calls expire worthless if wrong on direction or timing.",
            })
        else:
            strategies.append({
                "strategy": "Long Put / Bear Put Spread",
                "rationale": "Low IV + bullish sentiment = cheap downside protection or short speculation.",
                "risk": "Puts expire worthless if stock stays flat or rises.",
            })
    else:
        strategies.append({
            "strategy": "Vertical Spread",
            "rationale": "Neutral IV environment: use bull/bear call or put spread to define risk.",
            "risk": "Max loss limited to premium paid.",
        })

    return strategies[0] if strategies else {}


# ── Main data fetch ───────────────────────────────────────────────────────────

def _ticker_options_snapshot(ticker: str) -> Optional[Dict[str, Any]]:
    """Full options snapshot: P/C ratio, IV rank, ATM Greeks, strategy."""
    try:
        t = yf.Ticker(ticker)
        expirations = t.options
        if not expirations:
            return None

        # Current price
        hist = t.history(period="5d", auto_adjust=True)
        if hist.empty:
            return None
        S = float(hist["Close"].dropna().iloc[-1])
        prev = float(hist["Close"].dropna().iloc[-2]) if len(hist) >= 2 else S
        trend = "bullish" if S > prev else "bearish" if S < prev else "neutral"

        # Historical closes for IV rank proxy (use 1y returns vol as HV)
        hist_1y = t.history(period="1y", auto_adjust=True)
        hv_series = []
        if not hist_1y.empty and len(hist_1y) > 20:
            closes = hist_1y["Close"].dropna()
            log_rets = np.log(closes / closes.shift(1)).dropna()
            # Rolling 30-day annualised HV as IV proxy for rank
            rolling_hv = log_rets.rolling(30).std() * np.sqrt(252) * 100
            hv_series = [v for v in rolling_hv.dropna().tolist() if not np.isnan(v)]

        # Near-term expiry chain
        exp = expirations[0]
        chain = t.option_chain(exp)
        calls = chain.calls
        puts = chain.puts

        call_vol = int(calls["volume"].fillna(0).sum())
        put_vol = int(puts["volume"].fillna(0).sum())
        call_oi = int(calls["openInterest"].fillna(0).sum())
        put_oi = int(puts["openInterest"].fillna(0).sum())

        pc_vol = round(put_vol / call_vol, 3) if call_vol > 0 else None
        pc_oi = round(put_oi / call_oi, 3) if call_oi > 0 else None

        # ATM strike — nearest to current price
        all_strikes = calls["strike"].tolist()
        atm_strike = min(all_strikes, key=lambda k: abs(k - S)) if all_strikes else S

        # ATM call IV
        atm_calls = calls[abs(calls["strike"] - atm_strike) < 1]
        atm_iv = None
        if not atm_calls.empty and "impliedVolatility" in atm_calls.columns:
            iv_val = atm_calls["impliedVolatility"].dropna()
            if not iv_val.empty:
                atm_iv = round(float(iv_val.iloc[0]) * 100, 1)  # as percentage

        # IV rank & percentile
        ivr = _iv_rank(atm_iv or 30, hv_series) if hv_series else None
        ivp = _iv_percentile(atm_iv or 30, hv_series) if hv_series else None

        # ATM Greeks (time to expiry in years)
        import datetime
        try:
            exp_dt = datetime.datetime.strptime(exp, "%Y-%m-%d")
            T = max((exp_dt - datetime.datetime.now()).days / 365, 1 / 365)
        except Exception:
            T = 30 / 365
        sigma = (atm_iv or 30) / 100
        greeks = _bs_greeks(S, atm_strike, T, _RISK_FREE_RATE, sigma, "call")

        # Unusual volume flag
        avg_vol = call_vol + put_vol
        unusual = avg_vol > 10000

        # Strategy recommendation
        strat = _recommend_strategy(ivr, ivp, pc_vol or 1.0, trend,
                                    earnings_soon=False)

        # IV skew: compare OTM put IV vs OTM call IV
        skew = None
        try:
            otm_puts = puts[puts["strike"] < S * 0.95]["impliedVolatility"].dropna()
            otm_calls = calls[calls["strike"] > S * 1.05]["impliedVolatility"].dropna()
            if not otm_puts.empty and not otm_calls.empty:
                skew = round((otm_puts.mean() - otm_calls.mean()) * 100, 1)
        except Exception:
            pass

        return {
            "ticker": ticker,
            "expiry": exp,
            "spot": round(S, 2),
            "atm_strike": atm_strike,
            "call_volume": call_vol,
            "put_volume": put_vol,
            "put_call_vol_ratio": pc_vol,
            "put_call_oi_ratio": pc_oi,
            "atm_iv_pct": atm_iv,
            "iv_rank": ivr,
            "iv_percentile": ivp,
            "iv_skew_pct": skew,
            "greeks": greeks,
            "trend": trend,
            "unusual_volume": unusual,
            "signal": (
                "bearish_skew" if (pc_vol or 0) > 1.2
                else "bullish_skew" if (pc_vol or 0) < 0.7
                else "neutral"
            ),
            "recommended_strategy": strat,
        }
    except Exception as exc:
        log.debug("Options flow failed for %s: %s", ticker, exc)
        return None


def gather_options_flow(tickers: List[str]) -> List[Dict[str, Any]]:
    """Return full options snapshots for a list of tickers (parallel)."""
    sample = tickers[:_MAX_TICKERS]
    results: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(_ticker_options_snapshot, tk): tk for tk in sample}
        for fut in as_completed(futures):
            r = fut.result()
            if r:
                results.append(r)

    results.sort(key=lambda x: (x.get("unusual_volume", False), x.get("put_call_vol_ratio") or 0), reverse=True)
    log.info("Options flow: %d tickers with options data", len(results))
    return results


def get_single_options_snapshot(ticker: str) -> Optional[Dict[str, Any]]:
    """Public single-ticker fetch for Telegram /options and /iv commands."""
    return _ticker_options_snapshot(ticker)
