"""DB-backed storage for paper trades, LLM ideas, regimes, and runs."""
from __future__ import annotations

import logging
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import yfinance as yf

log = logging.getLogger(__name__)

HOLD_DAYS = 5


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _price_now(ticker: str) -> Optional[float]:
    try:
        h = yf.Ticker(ticker).history(period="2d", auto_adjust=True)
        return float(h["Close"].dropna().iloc[-1]) if not h.empty else None
    except Exception:
        return None


# ── Regime ────────────────────────────────────────────────────────────────────

def save_regime(conn: sqlite3.Connection, date: str, payload: Dict[str, Any]) -> None:
    vix = (payload.get("vix_and_volatility") or {})
    spot = (vix.get("vix_spot") or {}).get("last")
    ts = (vix.get("term_structure") or {})
    yc = payload.get("yield_curve") or {}
    rotation = payload.get("sector_rotation") or []

    vix_regime = (
        "extreme" if spot and spot > 30 else
        "high" if spot and spot > 22 else
        "medium" if spot and spot > 15 else
        "low"
    ) if spot else None

    yc_state = (
        "inverted" if yc.get("inverted") else
        "steep" if (yc.get("spread_bps") or 0) > 100 else
        "normal" if (yc.get("spread_bps") or 0) > 20 else
        "flat"
    )

    leader = rotation[0].get("ticker") if rotation else None
    laggard = rotation[-1].get("ticker") if rotation else None

    conn.execute(
        """INSERT OR REPLACE INTO regimes
           (date,vix_spot,vix_regime,vix_term_structure,yield_curve_bps,
            yield_curve_state,sector_leader,sector_laggard,recorded_at)
           VALUES(?,?,?,?,?,?,?,?,?)""",
        (date, spot, vix_regime, ts.get("signal"), yc.get("spread_bps"),
         yc_state, leader, laggard, _now()),
    )
    conn.commit()
    log.debug("Regime saved: vix=%s(%s), yc=%s", spot, vix_regime, yc_state)


def get_regime(conn: sqlite3.Connection, date: str) -> Dict[str, Any]:
    row = conn.execute("SELECT * FROM regimes WHERE date=?", (date,)).fetchone()
    return dict(row) if row else {}


# ── Paper trades ──────────────────────────────────────────────────────────────

def save_paper_trade(conn: sqlite3.Connection, trade: Dict[str, Any],
                     regime: Dict[str, Any]) -> int:
    """Insert a paper trade only if no open trade for the same signal+ticker+direction exists."""
    existing = conn.execute(
        """SELECT id FROM paper_trades
           WHERE signal_name=? AND ticker=? AND direction=? AND status='open'
           LIMIT 1""",
        (trade["signal_name"], trade["ticker"], trade["direction"]),
    ).fetchone()
    if existing:
        log.debug("Skipping duplicate paper trade: %s %s %s (id=%d)",
                  trade["signal_name"], trade["ticker"], trade["direction"], existing["id"])
        return existing["id"]

    cur = conn.execute(
        """INSERT INTO paper_trades
           (run_date,signal_name,ticker,direction,confidence,rationale,
            entry_date,entry_price,status,hold_days,regime_vix,regime_yc)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
        (trade["run_date"], trade["signal_name"], trade["ticker"],
         trade["direction"], trade.get("confidence"), trade.get("rationale"),
         trade.get("entry_date"), trade.get("entry_price"), "open",
         HOLD_DAYS, regime.get("vix_regime"), regime.get("yield_curve_state")),
    )
    conn.commit()
    return cur.lastrowid


def score_open_paper_trades(conn: sqlite3.Connection) -> int:
    """Score all open paper trades whose hold period has elapsed. Returns count updated."""
    from datetime import timedelta
    open_trades = conn.execute(
        "SELECT * FROM paper_trades WHERE status='open' AND entry_price IS NOT NULL"
    ).fetchall()

    updated = 0
    for t in open_trades:
        try:
            entry_dt = datetime.fromisoformat(t["entry_date"]).replace(tzinfo=timezone.utc)
        except Exception:
            continue
        days_elapsed = (datetime.now(timezone.utc) - entry_dt).days
        if days_elapsed < HOLD_DAYS:
            continue

        current = _price_now(t["ticker"])
        if not current:
            continue

        direction = t["direction"]
        raw_ret = (current - t["entry_price"]) / t["entry_price"]
        pnl = round((raw_ret if direction == "long" else -raw_ret) * 100, 2)
        status = "win" if pnl > 0 else "loss"

        conn.execute(
            "UPDATE paper_trades SET exit_price=?, pnl_pct=?, status=?, exit_date=?, days_held=? WHERE id=?",
            (round(current, 4), pnl, status, str(datetime.now(timezone.utc).date()), days_elapsed, t["id"]),
        )
        updated += 1

    if updated:
        conn.commit()
    return updated


def get_paper_stats(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Aggregate paper trade stats for dashboard + LLM prompt."""
    scored = conn.execute(
        "SELECT * FROM paper_trades WHERE status IN ('win','loss')"
    ).fetchall()
    open_trades = conn.execute(
        "SELECT COUNT(*) FROM paper_trades WHERE status='open'"
    ).fetchone()[0]

    if not scored:
        return {
            "total_trades": 0, "open_trades": open_trades,
            "wins": 0, "losses": 0, "win_rate_pct": 0.0,
            "avg_pnl_pct": 0.0, "avg_win_pct": 0.0, "avg_loss_pct": 0.0,
            "by_signal": {}, "by_regime": {}, "recent_trades": [],
            "equity_curve": [], "new_signals_today": 0,
        }

    wins = [t for t in scored if t["status"] == "win"]
    losses = [t for t in scored if t["status"] == "loss"]

    # By signal
    by_signal: Dict[str, Dict] = {}
    for t in scored:
        sn = t["signal_name"]
        by_signal.setdefault(sn, {"wins": 0, "losses": 0, "pnl": []})
        by_signal[sn]["wins" if t["status"] == "win" else "losses"] += 1
        if t["pnl_pct"] is not None:
            by_signal[sn]["pnl"].append(t["pnl_pct"])

    signal_stats = {
        sn: {
            "win_rate": round(v["wins"] / (v["wins"] + v["losses"]) * 100, 1),
            "avg_pnl": round(sum(v["pnl"]) / len(v["pnl"]), 2) if v["pnl"] else 0,
            "n": v["wins"] + v["losses"],
        }
        for sn, v in by_signal.items()
    }

    # By regime
    by_regime: Dict[str, Dict] = {}
    for t in scored:
        regime_key = f"vix:{t['regime_vix'] or 'unknown'} yc:{t['regime_yc'] or 'unknown'}"
        by_regime.setdefault(regime_key, {"wins": 0, "losses": 0, "pnl": []})
        by_regime[regime_key]["wins" if t["status"] == "win" else "losses"] += 1
        if t["pnl_pct"] is not None:
            by_regime[regime_key]["pnl"].append(t["pnl_pct"])

    regime_stats = {
        k: {
            "win_rate": round(v["wins"] / (v["wins"] + v["losses"]) * 100, 1),
            "avg_pnl": round(sum(v["pnl"]) / len(v["pnl"]), 2) if v["pnl"] else 0,
            "n": v["wins"] + v["losses"],
        }
        for k, v in by_regime.items() if v["wins"] + v["losses"] >= 3
    }

    all_pnl = [t["pnl_pct"] for t in scored if t["pnl_pct"] is not None]
    recent = conn.execute(
        "SELECT * FROM paper_trades WHERE status IN ('win','loss') ORDER BY entry_date DESC LIMIT 10"
    ).fetchall()

    # Simple equity curve
    equity_rows = conn.execute(
        "SELECT entry_date, pnl_pct FROM paper_trades WHERE status IN ('win','loss') ORDER BY entry_date"
    ).fetchall()
    cum = 0.0
    equity = []
    for r in equity_rows:
        cum += r["pnl_pct"] or 0
        equity.append({"date": r["entry_date"], "cumulative_pnl": round(cum, 2)})

    return {
        "total_trades": len(scored),
        "open_trades": open_trades,
        "wins": len(wins),
        "losses": len(losses),
        "win_rate_pct": round(len(wins) / len(scored) * 100, 1),
        "avg_pnl_pct": round(sum(all_pnl) / len(all_pnl), 2) if all_pnl else 0.0,
        "avg_win_pct": round(sum(t["pnl_pct"] for t in wins if t["pnl_pct"]) / len(wins), 2) if wins else 0.0,
        "avg_loss_pct": round(sum(t["pnl_pct"] for t in losses if t["pnl_pct"]) / len(losses), 2) if losses else 0.0,
        "by_signal": signal_stats,
        "by_regime": regime_stats,
        "recent_trades": [dict(r) for r in recent],
        "equity_curve": equity[-30:],
        "new_signals_today": 0,  # set by caller
    }


# ── LLM ideas ────────────────────────────────────────────────────────────────

def save_llm_ideas(conn: sqlite3.Connection, brief_dict: Dict[str, Any],
                   prices: Dict[str, float], vols: Dict[str, float],
                   regime: Dict[str, Any]) -> None:
    run_date = brief_dict.get("as_of", str(datetime.now(timezone.utc).date()))

    def _pos_size(conviction: str, vol: float | None) -> float:
        base = {"low": 0.01, "medium": 0.03, "high": 0.06}.get(conviction, 0.02)
        if vol and vol > 0:
            return round(min(base * (0.15 / vol), 0.12), 4)
        return round(base, 4)

    for idea in brief_dict.get("short_term_ideas", []) + brief_dict.get("long_term_ideas", []):
        tk = idea.get("ticker", "")
        ep = prices.get(tk)
        vol = vols.get(tk)
        conn.execute(
            """INSERT INTO llm_ideas
               (run_date,ticker,direction,horizon,conviction,thesis,entry_zone,
                stop_loss,target,entry_price_at_call,annual_vol,suggested_pos_pct,
                entry_date,status,regime_vix,regime_yc)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (run_date, tk, idea.get("direction"), idea.get("horizon"),
             idea.get("conviction"), idea.get("thesis"), idea.get("entry_zone"),
             idea.get("stop_loss"), idea.get("target"),
             round(ep, 4) if ep else None, round(vol, 4) if vol else None,
             _pos_size(idea.get("conviction", "low"), vol),
             run_date, "open",
             regime.get("vix_regime"), regime.get("yield_curve_state")),
        )
    conn.commit()


def score_open_llm_ideas(conn: sqlite3.Connection) -> int:
    """Score LLM ideas that are >5 days old."""
    open_ideas = conn.execute(
        "SELECT * FROM llm_ideas WHERE status='open' AND entry_price_at_call IS NOT NULL"
    ).fetchall()
    updated = 0
    for idea in open_ideas:
        try:
            entry_dt = datetime.fromisoformat(idea["entry_date"]).replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if (datetime.now(timezone.utc) - entry_dt).days < 5:
            continue
        current = _price_now(idea["ticker"])
        if not current:
            continue
        raw = (current - idea["entry_price_at_call"]) / idea["entry_price_at_call"]
        pnl = round((raw if idea["direction"] == "long" else -raw) * 100, 2)
        conn.execute(
            "UPDATE llm_ideas SET exit_price=?, pnl_pct=?, status=? WHERE id=?",
            (round(current, 4), pnl, "win" if pnl > 0 else "loss", idea["id"]),
        )
        updated += 1
    if updated:
        conn.commit()
    return updated


def get_llm_performance(conn: sqlite3.Connection, last_n_runs: int = 10) -> Dict[str, Any]:
    """Build performance summary for LLM self-correction prompt."""
    scored = conn.execute(
        "SELECT * FROM llm_ideas WHERE status IN ('win','loss') ORDER BY entry_date DESC LIMIT ?",
        (last_n_runs * 6,),
    ).fetchall()

    if not scored:
        return {}

    wins = [r for r in scored if r["status"] == "win"]
    losses = [r for r in scored if r["status"] == "loss"]
    all_pnl = [r["pnl_pct"] for r in scored if r["pnl_pct"] is not None]

    by_conv: Dict[str, list] = {}
    by_dir: Dict[str, list] = {}
    for r in scored:
        by_conv.setdefault(r["conviction"] or "unknown", []).append(r["pnl_pct"] or 0)
        by_dir.setdefault(r["direction"] or "unknown", []).append(r["pnl_pct"] or 0)

    def _avg(lst): return round(sum(lst) / len(lst), 2) if lst else 0.0

    return {
        "total_ideas_scored": len(scored),
        "win_rate_pct": round(len(wins) / len(scored) * 100, 1),
        "avg_pnl_pct": _avg(all_pnl),
        "avg_win_pct": _avg([r["pnl_pct"] for r in wins if r["pnl_pct"]]),
        "avg_loss_pct": _avg([r["pnl_pct"] for r in losses if r["pnl_pct"]]),
        "by_conviction": {k: {"avg_pnl": _avg(v), "n": len(v)} for k, v in by_conv.items()},
        "by_direction": {k: {"avg_pnl": _avg(v), "n": len(v)} for k, v in by_dir.items()},
        "stopped_out": 0,
        "targets_hit": 0,
        "recent_calls": [],
    }


# ── Run log ───────────────────────────────────────────────────────────────────

def start_run(conn: sqlite3.Connection, run_date: str, provider: str, model: str) -> int:
    cur = conn.execute(
        "INSERT INTO runs(run_date,started_at,llm_provider,llm_model) VALUES(?,?,?,?)",
        (run_date, _now(), provider, model),
    )
    conn.commit()
    return cur.lastrowid


def finish_run(conn: sqlite3.Connection, run_id: int, duration: float,
               payload_chars: int, signals: int, win_rate: float,
               avg_pnl: float, error: str | None = None) -> None:
    conn.execute(
        """UPDATE runs SET finished_at=?,duration_secs=?,payload_chars=?,
           signals_generated=?,win_rate_pct=?,avg_pnl_pct=?,error=? WHERE id=?""",
        (_now(), round(duration, 1), payload_chars, signals,
         win_rate, avg_pnl, error, run_id),
    )
    conn.commit()
