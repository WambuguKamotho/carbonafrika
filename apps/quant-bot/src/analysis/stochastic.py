"""Stochastic calculus tools for the AI Quant Bot.

Implements Geometric Brownian Motion (GBM) for price path simulation and
Ornstein-Uhlenbeck (OU) process for mean-reversion / pairs trading signals.

Core math uses only numpy + math.erf — no scipy/statsmodels dependency.

Theory:
  GBM:  dS = μS dt + σS dW    (stock price dynamics)
  OU:   dX = θ(μ - X) dt + σ dW  (mean-reverting spread dynamics)
"""
from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

# ── GBM parameter estimation ──────────────────────────────────────────────────

def estimate_gbm_params(
    close: pd.Series,
    window: int = 63,
) -> Tuple[float, float]:
    """Estimate annualised drift (μ) and volatility (σ) from log-returns.

    Uses the most recent `window` trading days. Returns (0.0, 0.0) if there
    is insufficient data.

    Returns:
        (mu_annual, sigma_annual) — both as decimals (0.15 = 15%)
    """
    if len(close) < max(window, 30):
        return 0.0, 0.0
    series = close.dropna().tail(window)
    log_returns = np.log(series.values[1:] / series.values[:-1])
    mu_daily    = float(np.mean(log_returns))
    sigma_daily = float(np.std(log_returns, ddof=1))
    mu_annual    = mu_daily * 252
    sigma_annual = sigma_daily * math.sqrt(252)
    return mu_annual, sigma_annual


# ── GBM path simulation ───────────────────────────────────────────────────────

def simulate_gbm_paths(
    S0: float,
    mu: float,
    sigma: float,
    T_days: int = 5,
    n_paths: int = 1_000,
    dt: float = 1 / 252,
) -> np.ndarray:
    """Simulate GBM price paths.

    Returns ndarray of shape (n_paths, T_days + 1).
    Column 0 is S0 (current price); columns 1..T are future daily closes.

    Uses the exact GBM discretisation:
        S(t+dt) = S(t) * exp((μ - σ²/2)*dt + σ*√dt*Z)  where Z ~ N(0,1)
    """
    if S0 <= 0 or sigma <= 0:
        return np.full((n_paths, T_days + 1), S0 if S0 > 0 else 0.0)

    rng   = np.random.default_rng()
    drift = (mu - 0.5 * sigma ** 2) * dt
    vol   = sigma * math.sqrt(dt)

    Z      = rng.standard_normal((n_paths, T_days))
    log_r  = drift + vol * Z                        # (n_paths, T_days)
    paths  = np.empty((n_paths, T_days + 1))
    paths[:, 0] = S0
    paths[:, 1:] = S0 * np.exp(np.cumsum(log_r, axis=1))
    return paths


# ── Barrier probability extraction ───────────────────────────────────────────

def path_probabilities(
    paths: np.ndarray,
    S0: float,
    target_price: Optional[float],
    stop_price: Optional[float],
) -> Dict[str, Optional[float]]:
    """Compute probability of hitting target vs stop across simulated paths.

    Uses a barrier simulation: at each day step, checks if price crossed
    target or stop. First barrier hit wins.

    Returns dict with keys:
        p_target      — probability target is hit first
        p_stop        — probability stop is hit first
        p_neither     — probability neither is hit within T_days
        expected_pnl  — mean terminal PnL % across all paths
        median_pnl    — median terminal PnL %
    """
    if paths.size == 0 or S0 <= 0:
        return {"p_target": None, "p_stop": None, "p_neither": None,
                "expected_pnl": None, "median_pnl": None}

    n_paths, steps = paths.shape
    hit_target = np.zeros(n_paths, dtype=bool)
    hit_stop   = np.zeros(n_paths, dtype=bool)
    active     = np.ones(n_paths, dtype=bool)

    for t in range(1, steps):
        if target_price is not None:
            crossed_target = active & (paths[:, t] >= target_price)
            hit_target |= crossed_target
            active &= ~crossed_target
        if stop_price is not None:
            crossed_stop = active & (paths[:, t] <= stop_price)
            hit_stop |= crossed_stop
            active &= ~crossed_stop

    terminal_pnl = (paths[:, -1] - S0) / S0 * 100  # percent

    return {
        "p_target":    round(float(hit_target.mean()), 3),
        "p_stop":      round(float(hit_stop.mean()), 3),
        "p_neither":   round(float(active.mean()), 3),
        "expected_pnl": round(float(terminal_pnl.mean()), 2),
        "median_pnl":  round(float(np.median(terminal_pnl)), 2),
    }


def enrich_signal_with_gbm(
    signal: Dict,
    close: pd.Series,
    target_pct: float = 0.03,
    stop_pct: float = 0.02,
    T_days: int = 5,
    n_paths: int = 1_000,
) -> Dict:
    """Attach GBM win-probability fields to a paper-trading signal dict.

    Adds keys: gbm_p_target, gbm_p_stop, gbm_expected_pnl, gbm_sigma.
    Also upgrades/downgrades confidence based on win probability.
    """
    if close is None or len(close) < 30:
        return signal

    S0 = float(close.dropna().iloc[-1])
    if S0 <= 0:
        return signal

    mu, sigma = estimate_gbm_params(close)
    if sigma == 0:
        return signal

    direction = signal.get("direction", "long")
    if direction == "long":
        target = S0 * (1 + target_pct)
        stop   = S0 * (1 - stop_pct)
    else:
        # For short: profit if price falls to stop_pct below, loss if rises
        target = S0 * (1 - target_pct)
        stop   = S0 * (1 + stop_pct)
        mu     = -mu  # flip drift for short

    paths = simulate_gbm_paths(S0, mu, sigma, T_days=T_days, n_paths=n_paths)
    probs = path_probabilities(paths, S0, target, stop)

    p_win = probs["p_target"]
    sig = {**signal,
           "gbm_p_target":    probs["p_target"],
           "gbm_p_stop":      probs["p_stop"],
           "gbm_expected_pnl": probs["expected_pnl"],
           "gbm_sigma":       round(sigma, 3)}

    # Auto-adjust confidence based on win probability
    if p_win is not None:
        if p_win >= 0.65 and signal.get("confidence") == "medium":
            sig["confidence"] = "high"
        elif p_win < 0.45 and signal.get("confidence") in ("medium", "high"):
            sig["confidence"] = "low"

    return sig


# ── Ornstein-Uhlenbeck mean reversion ────────────────────────────────────────

def ou_halflife(spread: pd.Series) -> Optional[float]:
    """Estimate OU mean-reversion half-life (in days) via OLS.

    Uses the regression: Δspread_t = α + β * spread_{t-1} + ε
    Half-life = -ln(2) / β  (positive β → diverging, skip those)

    Returns None if regression fails or spread is non-stationary.
    """
    s = spread.dropna()
    if len(s) < 30:
        return None
    y = np.diff(s.values)
    x = s.values[:-1]
    # OLS: [intercept, slope]
    coeffs = np.polyfit(x, y, 1)
    beta = coeffs[0]
    if beta >= 0:
        return None  # non-mean-reverting
    halflife = -math.log(2) / beta
    if halflife < 1 or halflife > 252:
        return None  # outside useful trading range
    return round(halflife, 1)


def ou_zscore(spread: pd.Series, lookback: int = 63) -> Optional[float]:
    """Z-score of current spread vs rolling mean/std.

    |z| > 2.0 → entry signal; |z| > 3.0 → strong signal.
    Returns None if insufficient data.
    """
    s = spread.dropna().tail(lookback)
    if len(s) < 20:
        return None
    mu_s  = float(s.mean())
    std_s = float(s.std(ddof=1))
    if std_s == 0:
        return None
    z = (float(s.iloc[-1]) - mu_s) / std_s
    return round(z, 2)


def pairs_signal(
    price_a: pd.Series,
    price_b: pd.Series,
    ticker_a: str,
    ticker_b: str,
    lookback: int = 63,
    z_entry: float = 2.0,
) -> Optional[Dict]:
    """Generate a pairs trading signal from two correlated price series.

    Spread = log(A) - log(B).
    If spread is mean-reverting (half-life < 30d) and |z| >= z_entry:
      - spread > z_entry → short A, long B (spread will narrow)
      - spread < -z_entry → long A, short B

    Returns None if no signal or data is insufficient.
    """
    if len(price_a) < 30 or len(price_b) < 30:
        return None

    # Align on common dates
    df = pd.DataFrame({"a": price_a, "b": price_b}).dropna()
    if len(df) < 30:
        return None

    spread = np.log(df["a"]) - np.log(df["b"])
    hl     = ou_halflife(spread)
    if hl is None:
        return None  # spread not mean-reverting

    z = ou_zscore(spread, lookback=lookback)
    if z is None or abs(z) < z_entry:
        return None

    if z > 0:
        # A is expensive relative to B → short A, long B
        ticker, direction = ticker_a, "short"
        rationale = (
            f"Pairs: {ticker_a}/{ticker_b} spread z={z:+.2f} "
            f"(half-life {hl:.0f}d) — {ticker_a} rich vs {ticker_b}, expect reversion"
        )
    else:
        # A is cheap relative to B → long A
        ticker, direction = ticker_a, "long"
        rationale = (
            f"Pairs: {ticker_a}/{ticker_b} spread z={z:+.2f} "
            f"(half-life {hl:.0f}d) — {ticker_a} cheap vs {ticker_b}, expect reversion"
        )

    confidence = "high" if abs(z) >= 3.0 else "medium"

    return {
        "signal_name": "ou_pairs",
        "ticker":      ticker,
        "direction":   direction,
        "rationale":   rationale,
        "confidence":  confidence,
        "ou_zscore":   z,
        "ou_halflife": hl,
        "pair":        f"{ticker_a}/{ticker_b}",
    }


# ── Realized vs Implied Volatility signal ─────────────────────────────────────

def rv_vs_iv_signal(
    realized_vol: float,
    implied_vol: float,
    ticker: str,
) -> Optional[Dict]:
    """Compare realized vol (GBM σ) to implied vol (from options).

    IV/RV > 1.25 → IV rich → sell vol (iron condor / covered call)
    IV/RV < 0.80 → IV cheap → buy vol (straddle / strangle)

    Returns a signal dict or None if ratio is within neutral band.
    """
    if realized_vol <= 0 or implied_vol <= 0:
        return None
    ratio = implied_vol / realized_vol
    if ratio >= 1.25:
        return {
            "signal_name": "rv_iv_sell_vol",
            "ticker":      ticker,
            "direction":   "short",
            "rationale":   (
                f"Vol premium: IV {implied_vol:.0%} vs RV {realized_vol:.0%} "
                f"(ratio {ratio:.2f}) — options overpriced, consider selling premium"
            ),
            "confidence":  "high" if ratio >= 1.5 else "medium",
            "iv_rv_ratio": round(ratio, 2),
        }
    if ratio <= 0.80:
        return {
            "signal_name": "rv_iv_buy_vol",
            "ticker":      ticker,
            "direction":   "long",
            "rationale":   (
                f"Vol discount: IV {implied_vol:.0%} vs RV {realized_vol:.0%} "
                f"(ratio {ratio:.2f}) — options cheap, consider buying vol"
            ),
            "confidence":  "high" if ratio <= 0.65 else "medium",
            "iv_rv_ratio": round(ratio, 2),
        }
    return None


# ── Convenience: batch enrichment ────────────────────────────────────────────

def enrich_signals(
    signals: List[Dict],
    prices_df: pd.DataFrame,
    T_days: int = 5,
    n_paths: int = 1_000,
) -> List[Dict]:
    """Attach GBM probabilities to a list of paper-trading signals.

    `prices_df` must have ticker symbols as column names and dates as index
    (standard output of fetch_prices_cached).
    """
    enriched = []
    for sig in signals:
        tk = sig.get("ticker", "")
        close = None
        if tk and "Close" in prices_df.columns.names:
            try:
                close = prices_df["Close"][tk].dropna()
            except (KeyError, TypeError):
                pass
        elif tk and tk in prices_df.columns:
            close = prices_df[tk].dropna()

        enriched.append(
            enrich_signal_with_gbm(sig, close, T_days=T_days, n_paths=n_paths)
            if close is not None and len(close) >= 30
            else sig
        )
    return enriched
