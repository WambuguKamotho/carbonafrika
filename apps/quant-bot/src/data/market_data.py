"""Market data via yfinance — equities, FX, commodities."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, Iterable, List

import pandas as pd
import yfinance as yf

from src.analysis.stochastic import estimate_gbm_params

log = logging.getLogger(__name__)


def fetch_prices(tickers: Iterable[str], lookback_days: int = 400) -> pd.DataFrame:
    """Return a wide DataFrame of adjusted close prices indexed by date."""
    tickers = list(dict.fromkeys(tickers))  # de-dupe, preserve order
    if not tickers:
        return pd.DataFrame()

    end = datetime.utcnow()
    start = end - timedelta(days=lookback_days)
    log.info("Downloading %d tickers from yfinance (%s -> %s)", len(tickers), start.date(), end.date())

    try:
        data = yf.download(
            tickers=tickers,
            start=start.strftime("%Y-%m-%d"),
            end=end.strftime("%Y-%m-%d"),
            auto_adjust=True,
            progress=False,
            group_by="ticker",
            threads=True,
        )
    except Exception as exc:  # noqa: BLE001
        log.error("yfinance download failed: %s", exc)
        return pd.DataFrame()

    if data is None or data.empty:
        log.warning("yfinance returned no data")
        return pd.DataFrame()

    # Normalize to a (date, ticker) -> close DataFrame
    closes: Dict[str, pd.Series] = {}
    if isinstance(data.columns, pd.MultiIndex):
        for tk in tickers:
            try:
                closes[tk] = data[tk]["Close"].dropna()
            except (KeyError, ValueError):
                log.debug("No data for %s", tk)
    else:
        # single ticker case
        closes[tickers[0]] = data["Close"].dropna()

    return pd.DataFrame(closes).sort_index()


def latest_snapshot(prices: pd.DataFrame) -> pd.DataFrame:
    """Return last price + 1d, 1w, 1m, 3m, 1y returns + 1m vol per ticker."""
    if prices.empty:
        return pd.DataFrame()

    rows = []
    for tk in prices.columns:
        s = prices[tk].dropna()
        if len(s) < 5:
            continue
        last = float(s.iloc[-1])

        def _ret(window: int) -> float | None:
            if len(s) <= window:
                return None
            return float(s.iloc[-1] / s.iloc[-window - 1] - 1.0)

        gbm_mu, gbm_sigma = estimate_gbm_params(s, window=63)
        rows.append({
            "ticker": tk,
            "last": round(last, 4),
            "ret_1d": _ret(1),
            "ret_1w": _ret(5),
            "ret_1m": _ret(21),
            "ret_3m": _ret(63),
            "ret_1y": _ret(252),
            "vol_1m_ann": float(s.pct_change().tail(21).std() * (252 ** 0.5)) if len(s) > 21 else None,
            "gbm_mu":    round(gbm_mu, 4) if gbm_mu else None,
            "gbm_sigma": round(gbm_sigma, 4) if gbm_sigma else None,
        })
    return pd.DataFrame(rows).set_index("ticker")


def sector_rotation_scores(etf_prices: pd.DataFrame) -> pd.DataFrame:
    """Simple momentum-based sector rotation: rank by blended 1m+3m return."""
    snap = latest_snapshot(etf_prices)
    if snap.empty:
        return snap
    snap["momentum_score"] = (snap["ret_1m"].fillna(0) * 0.4 + snap["ret_3m"].fillna(0) * 0.6)
    snap["rank"] = snap["momentum_score"].rank(ascending=False).astype(int)
    return snap.sort_values("momentum_score", ascending=False)
