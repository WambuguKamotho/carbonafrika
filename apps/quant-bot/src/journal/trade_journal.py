"""
Trade journal — persists every brief's calls, scores them against subsequent
price action, and produces a performance summary fed back to the LLM.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import yfinance as yf

from src.analysis.schemas import TradeBrief

log = logging.getLogger(__name__)

JOURNAL_FILE = "outputs/journal.json"


# ── I/O ───────────────────────────────────────────────────────────────────────

def _load(path: Path) -> Dict[str, Any]:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"entries": []}


def _save(data: Dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


# ── Current price fetch ───────────────────────────────────────────────────────

def _fetch_current_prices(tickers: List[str]) -> Dict[str, float]:
    if not tickers:
        return {}
    try:
        data = yf.download(tickers, period="2d", auto_adjust=True, progress=False)
        prices: Dict[str, float] = {}
        if hasattr(data.columns, "levels"):
            for tk in tickers:
                try:
                    prices[tk] = float(data["Close"][tk].dropna().iloc[-1])
                except Exception:
                    pass
        else:
            if len(tickers) == 1:
                prices[tickers[0]] = float(data["Close"].dropna().iloc[-1])
        return prices
    except Exception as exc:
        log.warning("Price fetch for journal scoring failed: %s", exc)
        return {}


# ── Position sizing ───────────────────────────────────────────────────────────

CONVICTION_BASE = {"low": 0.01, "medium": 0.03, "high": 0.06}  # % of portfolio

def compute_position_size(conviction: str, annual_vol: Optional[float],
                           target_vol: float = 0.15) -> float:
    """Vol-adjusted position size as fraction of portfolio."""
    base = CONVICTION_BASE.get(conviction, 0.02)
    if annual_vol and annual_vol > 0:
        # scale down for high-vol assets
        size = base * (target_vol / annual_vol)
        return round(min(size, 0.12), 4)  # cap at 12%
    return round(base, 4)


# ── Scoring ───────────────────────────────────────────────────────────────────

def _score_idea(idea: Dict[str, Any], current_price: Optional[float]) -> Dict[str, Any]:
    """Add outcome fields to a stored trade idea."""
    idea = dict(idea)
    entry = idea.get("entry_price_at_call")
    if not entry or not current_price:
        idea["status"] = "unknown"
        return idea

    direction = idea.get("direction", "long")
    raw_ret = (current_price - entry) / entry
    pnl_pct = round((raw_ret if direction == "long" else -raw_ret) * 100, 2)
    idea["current_price"] = round(current_price, 4)
    idea["pnl_pct"] = pnl_pct

    # Check stop / target if they were set as simple numbers
    def _parse_level(s: Optional[str]) -> Optional[float]:
        if not s:
            return None
        # take first number from strings like "180" or "178-182"
        import re
        m = re.search(r"[\d.]+", str(s))
        return float(m.group()) if m else None

    stop = _parse_level(idea.get("stop_loss"))
    target = _parse_level(idea.get("target"))

    if stop and ((direction == "long" and current_price <= stop) or
                 (direction == "short" and current_price >= stop)):
        idea["status"] = "stopped_out"
    elif target and ((direction == "long" and current_price >= target) or
                     (direction == "short" and current_price <= target)):
        idea["status"] = "target_hit"
    else:
        idea["status"] = "open"

    return idea


def score_open_positions(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Re-score any ideas still marked 'open' or unscored."""
    tickers_needed: List[str] = []
    for entry in entries:
        for idea in entry.get("short_term_ideas", []) + entry.get("long_term_ideas", []):
            if idea.get("status") in (None, "open", "unknown"):
                tk = idea.get("ticker")
                if tk:
                    tickers_needed.append(tk)

    prices = _fetch_current_prices(list(set(tickers_needed)))

    for entry in entries:
        for key in ("short_term_ideas", "long_term_ideas"):
            entry[key] = [
                _score_idea(idea, prices.get(idea.get("ticker")))
                if idea.get("status") in (None, "open", "unknown")
                else idea
                for idea in entry.get(key, [])
            ]
    return entries


# ── Performance summary ───────────────────────────────────────────────────────

def build_performance_summary(entries: List[Dict[str, Any]], last_n: int = 10) -> Dict[str, Any]:
    """Aggregate stats from the last N entries for LLM feedback."""
    recent = entries[-last_n:]
    all_ideas = []
    for e in recent:
        for idea in e.get("short_term_ideas", []) + e.get("long_term_ideas", []):
            if idea.get("pnl_pct") is not None:
                all_ideas.append(idea)

    if not all_ideas:
        return {}

    wins = [i for i in all_ideas if i["pnl_pct"] > 0]
    losses = [i for i in all_ideas if i["pnl_pct"] <= 0]
    by_conviction: Dict[str, List[float]] = {}
    by_direction: Dict[str, List[float]] = {}

    for i in all_ideas:
        conv = i.get("conviction", "unknown")
        by_conviction.setdefault(conv, []).append(i["pnl_pct"])
        direction = i.get("direction", "unknown")
        by_direction.setdefault(direction, []).append(i["pnl_pct"])

    def _avg(lst: List[float]) -> float:
        return round(sum(lst) / len(lst), 2) if lst else 0.0

    # sector call accuracy
    sector_results = []
    for e in recent:
        for sc in e.get("sector_calls", []):
            if sc.get("outcome_correct") is not None:
                sector_results.append(sc)

    return {
        "total_ideas_scored": len(all_ideas),
        "win_rate_pct": round(len(wins) / len(all_ideas) * 100, 1),
        "avg_pnl_pct": _avg([i["pnl_pct"] for i in all_ideas]),
        "avg_win_pct": _avg([i["pnl_pct"] for i in wins]),
        "avg_loss_pct": _avg([i["pnl_pct"] for i in losses]),
        "by_conviction": {k: {"avg_pnl": _avg(v), "n": len(v)} for k, v in by_conviction.items()},
        "by_direction": {k: {"avg_pnl": _avg(v), "n": len(v)} for k, v in by_direction.items()},
        "stopped_out": len([i for i in all_ideas if i.get("status") == "stopped_out"]),
        "targets_hit": len([i for i in all_ideas if i.get("status") == "target_hit"]),
        "recent_calls": [
            {
                "run": e.get("run_id"),
                "ideas": [
                    {"ticker": i.get("ticker"), "direction": i.get("direction"),
                     "conviction": i.get("conviction"), "pnl_pct": i.get("pnl_pct"),
                     "status": i.get("status")}
                    for i in e.get("short_term_ideas", [])[:5]
                    if i.get("pnl_pct") is not None
                ],
            }
            for e in recent[-3:]
        ],
    }


# ── Save new entry ────────────────────────────────────────────────────────────

def save_brief(brief: TradeBrief, prices: Dict[str, float],
               vols: Dict[str, float], journal_path: Path) -> None:
    """Append today's brief to the journal with entry prices and position sizes."""
    data = _load(journal_path)

    def _enrich_idea(idea: Any) -> Dict[str, Any]:
        d = idea.model_dump()
        tk = d.get("ticker", "")
        ep = prices.get(tk)
        vol = vols.get(tk)
        d["entry_price_at_call"] = round(ep, 4) if ep else None
        d["entry_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        d["annual_vol"] = round(vol, 4) if vol else None
        d["suggested_position_pct"] = compute_position_size(d.get("conviction", "low"), vol)
        d["status"] = "open"
        d["pnl_pct"] = None
        d["current_price"] = None
        return d

    entry = {
        "run_id": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "as_of": brief.as_of,
        "macro_summary": brief.macro_summary,
        "closing_note": brief.closing_note,
        "sector_calls": [sc.model_dump() for sc in brief.sector_calls],
        "short_term_ideas": [_enrich_idea(i) for i in brief.short_term_ideas],
        "long_term_ideas": [_enrich_idea(i) for i in brief.long_term_ideas],
        "risk_flags": [rf.model_dump() for rf in brief.risk_flags],
    }

    # Avoid duplicate entries for same day
    data["entries"] = [e for e in data["entries"] if e.get("run_id") != entry["run_id"]]
    data["entries"].append(entry)
    _save(data, journal_path)
    log.info("Journal saved: %d total entries", len(data["entries"]))


# ── Public API ────────────────────────────────────────────────────────────────

def load_and_score_journal(journal_path: Path) -> tuple[List[Dict], Dict[str, Any]]:
    """Load journal, score open positions, return (entries, performance_summary)."""
    data = _load(journal_path)
    entries = data.get("entries", [])
    if entries:
        entries = score_open_positions(entries)
        data["entries"] = entries
        _save(data, journal_path)
    summary = build_performance_summary(entries)
    return entries, summary
