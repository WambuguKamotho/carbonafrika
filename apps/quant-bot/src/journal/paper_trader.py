"""
Systematic paper trading engine.

Each run generates rule-based signals with a 5-day hold horizon.
Previous signals are auto-scored against actual price moves.
Results feed back into the LLM and the dashboard win-rate gauge.

Signals used:
  1. VIX term structure      — contango=long SPY, backwardation=short SPY
  2. Sector momentum         — long top-1m ETF, short bottom-1m ETF
  3. Put/call contrarian     — P/C > 1.2 = long, P/C < 0.7 = short (SPY)
  4. Yield curve regime      — inverted = long TLT, normal + steep = long XLF
  5. European momentum       — long best European country ETF, short worst
  6. Asian momentum          — long best Asian country ETF, short worst
  7. Global developed vs EM  — relative strength EFA vs EEM rotation
  8. FX momentum             — long/short currency pairs when 1d & 1m agree
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import yfinance as yf

log = logging.getLogger(__name__)

PAPER_TRADES_FILE = "outputs/paper_trades.json"
HOLD_DAYS = 5  # score after 5 trading days


# ── Price fetcher ─────────────────────────────────────────────────────────────

def _price_now(ticker: str) -> Optional[float]:
    try:
        h = yf.Ticker(ticker).history(period="2d", auto_adjust=True)
        return float(h["Close"].dropna().iloc[-1]) if not h.empty else None
    except Exception:
        return None


def _price_n_days_ago(ticker: str, n: int) -> Optional[float]:
    try:
        h = yf.Ticker(ticker).history(period=f"{n + 5}d", auto_adjust=True)
        series = h["Close"].dropna()
        if len(series) <= n:
            return float(series.iloc[0])
        return float(series.iloc[-(n + 1)])
    except Exception:
        return None


# ── Signal generators ─────────────────────────────────────────────────────────

def _signal_vix_term_structure(vix: Dict[str, Any]) -> Optional[Dict]:
    ts = vix.get("term_structure") or {}
    signal = ts.get("signal")
    spread = ts.get("vix3m_minus_spot")
    if signal is None or spread is None:
        return None
    direction = "long" if signal == "contango" else "short"
    return {
        "signal_name": "vix_term_structure",
        "ticker": "SPY",
        "direction": direction,
        "rationale": f"VIX term structure {signal} ({spread:+.2f} pts)",
        "confidence": "medium",
    }


def _signal_sector_momentum(rotation: List[Dict]) -> List[Dict]:
    if len(rotation) < 2:
        return []
    ranked = sorted(rotation, key=lambda r: r.get("rank", 99))
    signals = []
    top = ranked[0]
    bot = ranked[-1]
    signals.append({
        "signal_name": "sector_momentum_long",
        "ticker": top.get("ticker", ""),
        "direction": "long",
        "rationale": f"Top sector by 1m momentum: {top.get('ret_1m')}",
        "confidence": "medium",
    })
    signals.append({
        "signal_name": "sector_momentum_short",
        "ticker": bot.get("ticker", ""),
        "direction": "short",
        "rationale": f"Bottom sector by 1m momentum: {bot.get('ret_1m')}",
        "confidence": "low",
    })
    return signals


def _signal_put_call(options: List[Dict]) -> Optional[Dict]:
    ratios = [o.get("put_call_vol_ratio") for o in options if o.get("put_call_vol_ratio") is not None]
    if not ratios:
        return None
    avg_pc = sum(ratios) / len(ratios)
    if avg_pc > 1.2:
        return {
            "signal_name": "put_call_contrarian",
            "ticker": "SPY",
            "direction": "long",
            "rationale": f"Avg P/C ratio {avg_pc:.2f} > 1.2 — peak fear, contrarian long",
            "confidence": "medium",
        }
    if avg_pc < 0.7:
        return {
            "signal_name": "put_call_contrarian",
            "ticker": "SPY",
            "direction": "short",
            "rationale": f"Avg P/C ratio {avg_pc:.2f} < 0.7 — peak greed, contrarian short",
            "confidence": "medium",
        }
    return None


def _signal_yield_curve(yc: Dict) -> Optional[Dict]:
    if not yc:
        return None
    if yc.get("inverted"):
        return {
            "signal_name": "yield_curve_regime",
            "ticker": "TLT",
            "direction": "long",
            "rationale": f"Yield curve inverted ({yc.get('spread_bps')} bps) — defensive, long bonds",
            "confidence": "medium",
        }
    spread = yc.get("spread_bps", 0)
    if spread and spread > 30:
        return {
            "signal_name": "yield_curve_regime",
            "ticker": "XLF",
            "direction": "long",
            "rationale": f"Yield curve normal +{spread} bps — financials benefit from steeper curve",
            "confidence": "low",
        }
    return None


_EUROPEAN_ETFS = {"EWG", "EWU", "EWQ", "EWI", "EFA"}
_ASIAN_ETFS = {"EWJ", "INDA", "EWT", "EWY", "EWS", "EIDO", "VNM", "FXI"}


def _signal_regional_momentum(
    intl_records: List[Dict],
    region_tickers: set,
    signal_name: str,
    region_label: str,
) -> List[Dict]:
    """Long best / short worst ETF within a given regional bucket."""
    region = [
        r for r in intl_records
        if (r.get("ticker") or r.get("index", "")) in region_tickers
        and r.get("ret_1m") is not None
    ]
    if len(region) < 2:
        return []
    ranked = sorted(region, key=lambda r: r["ret_1m"], reverse=True)
    top = ranked[0]
    bot = ranked[-1]
    tk_top = top.get("ticker") or top.get("index", "")
    tk_bot = bot.get("ticker") or bot.get("index", "")
    ret_top = top["ret_1m"]  # already pct from df_to_records
    ret_bot = bot["ret_1m"]
    signals = []
    signals.append({
        "signal_name": f"{signal_name}_long",
        "ticker": tk_top,
        "direction": "long",
        "rationale": f"{region_label} top performer ({tk_top}): {ret_top:+.1f}% 1m",
        "confidence": "medium",
    })
    signals.append({
        "signal_name": f"{signal_name}_short",
        "ticker": tk_bot,
        "direction": "short",
        "rationale": f"{region_label} bottom performer ({tk_bot}): {ret_bot:+.1f}% 1m",
        "confidence": "low",
    })
    return signals


_FX_SKIP = {"DX-Y.NYB", "CNH=X"}  # dollar index + CNH (illiquid/pegged)


def _signal_fx_momentum(fx_records: List[Dict], max_signals: int = 3) -> List[Dict]:
    """
    Long/short currency pairs when 1-day and 1-month momentum both agree.
    Ranks candidates by |ret_1m| and takes the top `max_signals`.
    """
    candidates = []
    for r in fx_records:
        tk = r.get("ticker", "")
        if "=X" not in tk or tk in _FX_SKIP:
            continue
        ret_1d = r.get("ret_1d")
        ret_1m = r.get("ret_1m")
        if ret_1d is None or ret_1m is None:
            continue

        bull = ret_1d > 0.15 and ret_1m > 0.3
        bear = ret_1d < -0.15 and ret_1m < -0.3
        if not bull and not bear:
            continue

        direction = "long" if bull else "short"
        abs_1m = abs(ret_1m)
        confidence = "high" if abs_1m >= 2.5 else ("medium" if abs_1m >= 0.8 else "low")

        base = tk.replace("=X", "")
        pair = f"{base[:3]}/{base[3:]}" if "USD" in base else f"USD/{base}"

        candidates.append({
            "signal_name": f"fx_momentum_{direction}",
            "ticker": tk,
            "direction": direction,
            "rationale": (
                f"FX momentum aligned: {pair} {ret_1d:+.2f}% 1d, {ret_1m:+.2f}% 1m"
            ),
            "confidence": confidence,
            "_abs_1m": abs_1m,
        })

    # Take top N by strength
    candidates.sort(key=lambda x: x["_abs_1m"], reverse=True)
    signals = []
    for c in candidates[:max_signals]:
        c.pop("_abs_1m", None)
        signals.append(c)
    return signals


def _signal_developed_vs_em(intl_records: List[Dict]) -> Optional[Dict]:
    """EFA vs EEM relative strength — long whichever has stronger 1m momentum."""
    by_ticker = {
        (r.get("ticker") or r.get("index", "")): r
        for r in intl_records
    }
    efa = by_ticker.get("EFA")
    eem = by_ticker.get("EEM")
    if not efa or not eem:
        return None
    efa_ret = efa.get("ret_1m")
    eem_ret = eem.get("ret_1m")
    if efa_ret is None or eem_ret is None:
        return None
    if efa_ret > eem_ret:
        return {
            "signal_name": "developed_vs_em",
            "ticker": "EFA",
            "direction": "long",
            "rationale": f"Developed markets outperforming EM: EFA {efa_ret:+.1f}% vs EEM {eem_ret:+.1f}% 1m",
            "confidence": "medium",
        }
    else:
        return {
            "signal_name": "developed_vs_em",
            "ticker": "EEM",
            "direction": "long",
            "rationale": f"EM outperforming developed: EEM {eem_ret:+.1f}% vs EFA {efa_ret:+.1f}% 1m",
            "confidence": "medium",
        }


# ── Generate signals for this run ─────────────────────────────────────────────

def _signal_ou_pairs(prices_df) -> List[Dict]:
    """Ornstein-Uhlenbeck pairs signals for correlated asset pairs.

    Requires a prices DataFrame with tickers as columns (from fetch_prices_cached).
    Returns signals when spread z-score breaches ±2σ and half-life < 30 days.
    """
    from src.analysis.stochastic import pairs_signal as _pairs_signal
    import pandas as pd

    if prices_df is None or prices_df.empty:
        return []

    PAIRS = [
        ("XOM", "CVX"),
        ("JPM", "BAC"),
        ("XLK", "XLC"),
        ("EFA", "EEM"),
        ("GS",  "BAC"),
    ]

    signals = []
    for tk_a, tk_b in PAIRS:
        try:
            col_a = prices_df[tk_a].dropna() if tk_a in prices_df.columns else None
            col_b = prices_df[tk_b].dropna() if tk_b in prices_df.columns else None
            if col_a is None or col_b is None:
                continue
            sig = _pairs_signal(col_a, col_b, tk_a, tk_b)
            if sig:
                signals.append(sig)
        except Exception as exc:
            log.debug("Pairs signal %s/%s failed: %s", tk_a, tk_b, exc)

    return signals


def generate_signals(payload: Dict[str, Any], prices_df=None) -> List[Dict]:
    signals = []

    vix = payload.get("vix_and_volatility") or payload.get("vix") or {}
    s = _signal_vix_term_structure(vix)
    if s:
        signals.append(s)

    rotation = payload.get("sector_rotation", [])
    signals.extend(_signal_sector_momentum(rotation))

    options = payload.get("options_flow") or payload.get("options") or []
    s = _signal_put_call(options)
    if s:
        signals.append(s)

    yc = payload.get("yield_curve") or {}
    s = _signal_yield_curve(yc)
    if s:
        signals.append(s)

    intl = payload.get("international_etfs", [])
    signals.extend(_signal_regional_momentum(
        intl, _EUROPEAN_ETFS, "european_momentum", "Europe"
    ))
    signals.extend(_signal_regional_momentum(
        intl, _ASIAN_ETFS, "asian_momentum", "Asia"
    ))
    s = _signal_developed_vs_em(intl)
    if s:
        signals.append(s)

    fx = payload.get("fx_and_commodities") or payload.get("fx") or []
    signals.extend(_signal_fx_momentum(fx))

    # OU pairs signals (needs raw price DataFrame)
    signals.extend(_signal_ou_pairs(prices_df))

    # GBM enrichment: attach win probabilities to every signal
    if prices_df is not None and not prices_df.empty:
        from src.analysis.stochastic import enrich_signal_with_gbm
        enriched = []
        for sig in signals:
            tk = sig.get("ticker", "")
            close = prices_df[tk].dropna() if tk in prices_df.columns else None
            enriched.append(
                enrich_signal_with_gbm(sig, close)
                if close is not None and len(close) >= 30
                else sig
            )
        signals = enriched

    return signals


# ── Score a trade ─────────────────────────────────────────────────────────────

def _score_trade(trade: Dict) -> Dict:
    trade = dict(trade)
    if trade.get("status") not in (None, "open"):
        return trade

    entry_date_str = trade.get("entry_date", "")
    try:
        entry_date = datetime.fromisoformat(entry_date_str).replace(tzinfo=timezone.utc)
    except Exception:
        return trade

    now = datetime.now(timezone.utc)
    trading_days_held = (now - entry_date).days * 5 // 7  # rough approximation

    if trading_days_held < HOLD_DAYS:
        trade["status"] = "open"
        trade["days_held"] = trading_days_held
        return trade

    ticker = trade.get("ticker", "")
    entry_price = trade.get("entry_price")
    current_price = _price_now(ticker)

    if not entry_price or not current_price:
        trade["status"] = "unknown"
        return trade

    direction = trade.get("direction", "long")
    raw_ret = (current_price - entry_price) / entry_price
    pnl_pct = round((raw_ret if direction == "long" else -raw_ret) * 100, 2)

    trade["exit_price"] = round(current_price, 4)
    trade["pnl_pct"] = pnl_pct
    trade["status"] = "win" if pnl_pct > 0 else "loss"
    trade["days_held"] = trading_days_held
    return trade


# ── I/O ───────────────────────────────────────────────────────────────────────

def _load(path: Path) -> Dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"trades": []}


def _save(data: Dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


# ── Public API ────────────────────────────────────────────────────────────────

def run_paper_trading(payload: Dict[str, Any], trades_path: Path) -> Dict[str, Any]:
    """
    Score existing open trades, generate new signals, return summary stats.
    Called once per bot run.
    """
    data = _load(trades_path)
    trades: List[Dict] = data.get("trades", [])

    # 1. Score all open trades
    trades = [_score_trade(t) for t in trades]

    # 2. Generate new signals for today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_signals = generate_signals(payload)
    new_trades = []
    for sig in new_signals:
        ticker = sig.get("ticker", "")
        price = _price_now(ticker)
        new_trades.append({
            "run_id": today,
            "signal_name": sig["signal_name"],
            "ticker": ticker,
            "direction": sig["direction"],
            "rationale": sig["rationale"],
            "confidence": sig["confidence"],
            "entry_date": today,
            "entry_price": round(price, 4) if price else None,
            "exit_price": None,
            "pnl_pct": None,
            "status": "open",
            "days_held": 0,
            "hold_days": HOLD_DAYS,
        })

    trades.extend(new_trades)
    data["trades"] = trades
    _save(data, trades_path)

    # 3. Compute stats
    scored = [t for t in trades if t.get("status") in ("win", "loss")]
    wins = [t for t in scored if t["status"] == "win"]
    losses = [t for t in scored if t["status"] == "loss"]

    by_signal: Dict[str, Dict] = {}
    for t in scored:
        sn = t.get("signal_name", "unknown")
        by_signal.setdefault(sn, {"wins": 0, "losses": 0, "pnl": []})
        by_signal[sn]["wins" if t["status"] == "win" else "losses"] += 1
        if t.get("pnl_pct") is not None:
            by_signal[sn]["pnl"].append(t["pnl_pct"])

    signal_stats = {
        sn: {
            "win_rate": round(v["wins"] / (v["wins"] + v["losses"]) * 100, 1),
            "avg_pnl": round(sum(v["pnl"]) / len(v["pnl"]), 2) if v["pnl"] else 0,
            "n": v["wins"] + v["losses"],
        }
        for sn, v in by_signal.items()
    }

    avg_pnl = sum(t["pnl_pct"] for t in scored if t.get("pnl_pct") is not None)
    avg_pnl = round(avg_pnl / len(scored), 2) if scored else 0.0

    # Equity curve: cumulative P&L per run
    equity: List[Dict] = []
    cum = 0.0
    for t in sorted(scored, key=lambda x: x.get("entry_date", "")):
        cum += t.get("pnl_pct", 0) or 0
        equity.append({"date": t.get("entry_date", ""), "cumulative_pnl": round(cum, 2)})

    stats = {
        "total_trades": len(scored),
        "open_trades": len([t for t in trades if t.get("status") == "open"]),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate_pct": round(len(wins) / len(scored) * 100, 1) if scored else 0.0,
        "avg_pnl_pct": avg_pnl,
        "avg_win_pct": round(sum(t["pnl_pct"] for t in wins if t.get("pnl_pct")) / len(wins), 2) if wins else 0.0,
        "avg_loss_pct": round(sum(t["pnl_pct"] for t in losses if t.get("pnl_pct")) / len(losses), 2) if losses else 0.0,
        "by_signal": signal_stats,
        "new_signals_today": len(new_trades),
        "recent_trades": sorted(scored, key=lambda x: x.get("entry_date", ""), reverse=True)[:10],
        "equity_curve": equity[-30:],  # last 30 data points
    }

    log.info("Paper trading: %d scored, win_rate=%.1f%%, avg_pnl=%.2f%%, %d new signals today",
             len(scored), stats["win_rate_pct"], avg_pnl, len(new_trades))
    return stats
