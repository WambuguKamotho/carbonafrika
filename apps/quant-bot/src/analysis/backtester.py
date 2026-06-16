"""Signal backtester — computes win rate, Sharpe, and max drawdown per signal type.

Uses paper_trades table (already in DB) — no re-simulation or external calls needed.
Closed trades have real pnl_pct; open trades are scored hypothetically from prices table.
"""
from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional, Tuple

import numpy as np

log = logging.getLogger(__name__)

_MIN_TRADES = 3   # minimum closed trades required to compute meaningful stats


# ── Math helpers ──────────────────────────────────────────────────────────────

def compute_sharpe(pnl_series: List[float], periods_per_year: int = 52) -> Optional[float]:
    """Annualised Sharpe ratio. periods_per_year=52 assumes weekly trade cadence."""
    if len(pnl_series) < 3:
        return None
    a = np.array(pnl_series, dtype=float)
    std = float(np.std(a, ddof=1))
    if std == 0:
        return None
    return round(float(np.mean(a)) / std * math.sqrt(periods_per_year), 2)


def compute_max_drawdown(pnl_series: List[float]) -> float:
    """Max peak-to-trough decline of a cumulative equity curve starting at 100."""
    if not pnl_series:
        return 0.0
    equity = [100.0]
    for p in pnl_series:
        equity.append(equity[-1] * (1 + p / 100))
    peak = equity[0]
    max_dd = 0.0
    for v in equity:
        if v > peak:
            peak = v
        dd = (v - peak) / peak * 100
        if dd < max_dd:
            max_dd = dd
    return round(max_dd, 2)


def build_equity_curve(pnl_series: List[float]) -> List[float]:
    """Cumulative equity curve starting at 100."""
    equity = [100.0]
    for p in pnl_series:
        equity.append(round(equity[-1] * (1 + p / 100), 2))
    return equity


# ── DB queries ────────────────────────────────────────────────────────────────

def _get_closed_trades(conn, signal_name: Optional[str] = None,
                       lookback_days: int = 365) -> List[Dict]:
    """Return closed trades with pnl_pct, sorted by entry_date."""
    sql = """
        SELECT signal_name, ticker, direction, entry_date, exit_date,
               entry_price, exit_price, pnl_pct, status
        FROM paper_trades
        WHERE status IN ('win', 'loss', 'unknown')
          AND pnl_pct IS NOT NULL
          AND entry_date >= date('now', ?)
    """
    params: list = [f"-{lookback_days} days"]
    if signal_name:
        sql += " AND signal_name = ?"
        params.append(signal_name)
    sql += " ORDER BY entry_date ASC"
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def _get_open_trades_with_prices(conn) -> List[Dict]:
    """Return open trades with latest price from prices table for hypothetical scoring."""
    sql = """
        SELECT pt.id, pt.signal_name, pt.ticker, pt.direction,
               pt.entry_date, pt.entry_price, pt.hold_days,
               p.close as current_price
        FROM paper_trades pt
        LEFT JOIN (
            SELECT ticker, close
            FROM prices
            WHERE (ticker, date) IN (
                SELECT ticker, MAX(date) FROM prices GROUP BY ticker
            )
        ) p ON p.ticker = pt.ticker
        WHERE pt.status = 'open' AND pt.entry_price IS NOT NULL
    """
    rows = []
    for r in conn.execute(sql).fetchall():
        d = dict(r)
        if d["current_price"] and d["entry_price"]:
            sign = 1 if d["direction"] == "long" else -1
            d["pnl_pct"] = round(sign * (d["current_price"] / d["entry_price"] - 1) * 100, 3)
        else:
            d["pnl_pct"] = None
        rows.append(d)
    return rows


# ── Core stats builder ────────────────────────────────────────────────────────

def _build_stats(signal_name: str, trades: List[Dict]) -> Optional[Dict]:
    """Build stats dict for a list of trades (all same signal_name)."""
    pnls = [t["pnl_pct"] for t in trades if t.get("pnl_pct") is not None]
    if len(pnls) < _MIN_TRADES:
        return None

    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    win_rate = round(len(wins) / len(pnls), 3)
    avg_pnl = round(float(np.mean(pnls)), 3)
    sharpe = compute_sharpe(pnls)
    max_dd = compute_max_drawdown(pnls)
    equity = build_equity_curve(pnls)

    # Best / worst trade
    sorted_trades = sorted(trades, key=lambda t: t.get("pnl_pct") or 0, reverse=True)
    best = sorted_trades[0] if sorted_trades else None
    worst = sorted_trades[-1] if len(sorted_trades) > 1 else None

    return {
        "signal_name":       signal_name,
        "n_trades":          len(pnls),
        "win_rate":          win_rate,
        "avg_pnl_pct":       avg_pnl,
        "sharpe":            sharpe,
        "max_drawdown_pct":  max_dd,
        "total_return_pct":  round(equity[-1] - 100, 2),
        "best_trade":  {"ticker": best["ticker"],  "pnl_pct": best["pnl_pct"],  "date": best.get("entry_date", "")} if best else None,
        "worst_trade": {"ticker": worst["ticker"], "pnl_pct": worst["pnl_pct"], "date": worst.get("entry_date", "")} if worst else None,
        "equity_curve":      equity,
        "by_ticker":         _by_ticker(trades),
    }


def _by_ticker(trades: List[Dict]) -> List[Dict]:
    """Aggregate pnl per ticker."""
    acc: Dict[str, List[float]] = {}
    for t in trades:
        tk = t["ticker"]
        if t.get("pnl_pct") is not None:
            acc.setdefault(tk, []).append(t["pnl_pct"])
    result = []
    for tk, pnls in acc.items():
        result.append({
            "ticker":   tk,
            "n":        len(pnls),
            "avg_pnl":  round(float(np.mean(pnls)), 2),
            "win_rate": round(len([p for p in pnls if p > 0]) / len(pnls), 2),
        })
    return sorted(result, key=lambda x: x["avg_pnl"], reverse=True)


# ── Public API ────────────────────────────────────────────────────────────────

def run_backtest(conn, lookback_days: int = 365) -> Dict[str, Dict]:
    """Run backtest across all signal types. Returns dict keyed by signal_name.

    Includes both closed trades and hypothetically-scored open trades.
    """
    closed = _get_closed_trades(conn, lookback_days=lookback_days)
    open_hyp = [t for t in _get_open_trades_with_prices(conn) if t.get("pnl_pct") is not None]

    all_trades = closed + open_hyp

    # Group by signal_name
    by_signal: Dict[str, List[Dict]] = {}
    for t in all_trades:
        by_signal.setdefault(t["signal_name"], []).append(t)

    results: Dict[str, Dict] = {}
    for sig, trades in by_signal.items():
        stats = _build_stats(sig, trades)
        if stats:
            results[sig] = stats

    log.info("Backtest: %d signal types, %d total trades", len(results), len(all_trades))
    return results


def backtest_signal_type(conn, signal_name: str, lookback_days: int = 365) -> Optional[Dict]:
    """Backtest a single named signal type. Returns stats dict or None if < 3 trades."""
    closed = _get_closed_trades(conn, signal_name=signal_name, lookback_days=lookback_days)
    open_hyp = [
        t for t in _get_open_trades_with_prices(conn)
        if t["signal_name"] == signal_name and t.get("pnl_pct") is not None
    ]
    trades = closed + open_hyp
    return _build_stats(signal_name, trades)


def rank_signals(backtest_results: Dict[str, Dict]) -> List[Dict]:
    """Return signals sorted by Sharpe ratio (best first). Suitable for dashboard table."""
    ranked = []
    for sig, stats in backtest_results.items():
        ranked.append({
            "signal_name":      sig,
            "n_trades":         stats["n_trades"],
            "win_rate":         stats["win_rate"],
            "avg_pnl_pct":      stats["avg_pnl_pct"],
            "sharpe":           stats["sharpe"],
            "max_drawdown_pct": stats["max_drawdown_pct"],
            "total_return_pct": stats["total_return_pct"],
        })
    return sorted(ranked, key=lambda x: (x["sharpe"] or -99), reverse=True)
