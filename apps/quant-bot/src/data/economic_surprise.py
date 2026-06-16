"""Economic Surprise Index — measures whether macro data is coming in better or worse than trend.

Uses FRED data already cached in macro_cache DB. Zero additional API calls.

Method:
  For each indicator, compare the latest value to the prior observation and to
  a rolling average of all cached values (proxy for "trend/expectation").
  Normalise each indicator's change to a z-score using the available history.
  Composite ESI = average of z-scores (sign-adjusted per indicator direction).

Interpretation:
  ESI > +0.5  → data beating trend  → risk-on, bullish macro backdrop
  ESI < -0.5  → data missing trend  → risk-off, bearish macro
  -0.5 to +0.5 → neutral
"""
from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional, Tuple

import numpy as np

log = logging.getLogger(__name__)

# Series to include and whether higher/lower is economically positive
# "lower_better" → a drop is a positive surprise (e.g. unemployment falling)
# "higher_better" → a rise is a positive surprise (e.g. GDP growing)
# "spread_lower"  → spread compression = risk-on = positive surprise
_SERIES: Dict[str, Tuple[str, str]] = {
    "Unemployment":    ("fred:Unemployment",    "lower_better"),
    "CPI":             ("fred:CPI_YoY",         "lower_better"),   # disinflation = positive
    "Core_CPI":        ("fred:Core_CPI",        "lower_better"),
    "HY_Spread":       ("fred:HighYield_Spread","lower_better"),   # spread tightening = risk-on
    "Fed_Funds":       ("fred:FedFunds",        "lower_better"),   # rate cuts = stimulus
    "Yield_10y":       ("fred:Yield_10y",       "context"),        # context only, not scored
    "GDP_real":        ("fred:GDP_real",        "higher_better"),
}
_SCORED = [k for k, (_, d) in _SERIES.items() if d != "context"]


def _query_series(conn, series_id: str) -> List[Tuple[str, float]]:
    """Return [(date, value), ...] ascending for a series_id."""
    rows = conn.execute(
        "SELECT date, value FROM macro_cache WHERE series_id=? AND value IS NOT NULL ORDER BY date ASC",
        (series_id,),
    ).fetchall()
    return [(r["date"], float(r["value"])) for r in rows]


def _momentum_zscore(values: List[float]) -> Optional[float]:
    """Z-score of the most recent change vs. the distribution of all changes."""
    if len(values) < 2:
        return None
    changes = [values[i] - values[i - 1] for i in range(1, len(values))]
    if len(changes) < 1:
        return None
    last_change = changes[-1]
    if len(changes) < 2:
        # Only one change — return the sign as a weak signal
        return 1.0 if last_change > 0 else (-1.0 if last_change < 0 else 0.0)
    mean_c = float(np.mean(changes))
    std_c = float(np.std(changes, ddof=1))
    if std_c == 0:
        return 0.0
    return round((last_change - mean_c) / std_c, 2)


def compute_surprise_index(conn) -> Dict:
    """Compute Economic Surprise Index from cached FRED data.

    Returns:
        composite_score: float (z-score composite)
        regime: "positive" | "negative" | "neutral"
        signal: "risk_on" | "risk_off" | "neutral"
        by_indicator: dict of per-series detail
        rationale: str summary
    """
    by_indicator: Dict[str, Dict] = {}
    scored_zscores: List[float] = []

    for label, (series_id, direction) in _SERIES.items():
        rows = _query_series(conn, series_id)
        if not rows:
            continue

        dates = [r[0] for r in rows]
        values = [r[1] for r in rows]
        latest = values[-1]
        prev = values[-2] if len(values) >= 2 else None
        change = round(latest - prev, 4) if prev is not None else None

        # Trend direction label
        if change is None:
            trend = "stable"
        elif change > 0:
            trend = "rising"
        elif change < 0:
            trend = "falling"
        else:
            trend = "stable"

        # Economic direction of the trend
        if direction == "lower_better":
            econ_direction = "improving" if (change or 0) < 0 else ("worsening" if (change or 0) > 0 else "stable")
        elif direction == "higher_better":
            econ_direction = "improving" if (change or 0) > 0 else ("worsening" if (change or 0) < 0 else "stable")
        else:
            econ_direction = trend

        # Z-score (sign-adjusted so positive z = positive macro surprise)
        raw_z = _momentum_zscore(values)
        if raw_z is not None and direction == "lower_better":
            z = -raw_z   # flip: falling = positive
        elif raw_z is not None:
            z = raw_z
        else:
            z = None

        by_indicator[label] = {
            "series_id":    series_id,
            "latest":       round(latest, 4),
            "prev":         round(prev, 4) if prev is not None else None,
            "change":       change,
            "trend":        trend,
            "direction":    econ_direction,
            "z_score":      round(z, 2) if z is not None else None,
            "as_of":        dates[-1],
            "n_obs":        len(values),
        }

        if direction != "context" and z is not None:
            scored_zscores.append(z)

    # Composite
    if scored_zscores:
        composite = round(float(np.mean(scored_zscores)), 2)
    else:
        composite = 0.0

    if composite > 0.5:
        regime = "positive"
        signal = "risk_on"
    elif composite < -0.5:
        regime = "negative"
        signal = "risk_off"
    else:
        regime = "neutral"
        signal = "neutral"

    improving = [k for k, v in by_indicator.items() if v.get("direction") == "improving" and k in _SCORED]
    worsening = [k for k, v in by_indicator.items() if v.get("direction") == "worsening" and k in _SCORED]
    n_scored = len(scored_zscores)

    if improving and n_scored:
        rationale = f"{len(improving)}/{n_scored} indicators improving: {', '.join(improving[:3])}"
    elif worsening and n_scored:
        rationale = f"{len(worsening)}/{n_scored} indicators worsening: {', '.join(worsening[:3])}"
    else:
        rationale = "Macro trend data insufficient for strong signal"

    result = {
        "composite_score": composite,
        "regime":          regime,
        "signal":          signal,
        "rationale":       rationale,
        "by_indicator":    by_indicator,
        "n_series":        n_scored,
    }

    log.info("ESI: composite=%.2f (%s) — %s", composite, regime, rationale)
    return result
