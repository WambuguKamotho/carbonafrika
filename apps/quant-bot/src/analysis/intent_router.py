"""Classify and route user messages to the right handler.

Intent categories:
  memory_save    — "remember X", "store X", "note that X"
  memory_recall  — "what do you know about me", "my preferences"
  memory_forget  — "forget X", "remove X from memory"
  db_query       — "show my trades", "what's my win rate", "open positions"
  config_update  — "add TSLA to watchlist", "remove BP from watchlist"
  reminder       — "remind me in X days/hours", "set a reminder"
  trading        — everything else → TradingAdvisor
"""
from __future__ import annotations

import re
import sqlite3
import yaml
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

log = logging.getLogger(__name__)

# ── Keyword patterns ───────────────────────────────────────────────────────────

_MEMORY_SAVE = re.compile(
    r"\b(remember|store|save|note that|keep in mind|i prefer|i like|i want|"
    r"my risk|my style|my strategy|i am|i'm a|i trade|i focus|i have)\b",
    re.I
)
_MEMORY_RECALL = re.compile(
    r"\b(what do you know|my profile|my preferences|my style|what have i told|"
    r"recall|show memory|my settings|what you know about me)\b",
    re.I
)
_MEMORY_FORGET = re.compile(
    r"\b(forget|remove from memory|delete memory|clear memory|stop remembering)\b",
    re.I
)
_DB_QUERY = re.compile(
    r"\b(my trades|open trades|win rate|performance|trade history|how am i doing|"
    r"pnl|profit|loss|my signals|closed trades|scored trades|last run|run history)\b",
    re.I
)
_CONFIG_UPDATE = re.compile(
    r"\b(add .+ to (my )?watchlist|watch .+|track .+|remove .+ from (my )?watchlist|"
    r"stop watching|unwatch)\b",
    re.I
)
_MARKET_HOURS = re.compile(
    r"\b(how long|how many hours|in how long|when does|what time does|when do|how far|"
    r"until market|before market|before the market|"
    r"market open(s)?|market close(s)?|trading hours|market hours|"
    r"NYSE open|markets open|exchange open)\b",
    re.I
)
_PAPER_TRADES = re.compile(
    r"\b(paper trade[s]?|paper trading|paper position[s]?|"
    r"any (paper|open) trade[s]?|what.*paper|show.*paper|"
    r"systematic signal[s]?|signal trade[s]?)\b",
    re.I
)
_MARKET_PERFORMANCE = re.compile(
    r"\b(how did.*market|market perform|global market|yesterday.*market|"
    r"market.*yesterday|how.*market.*do|markets.*today|today.*market[s]?)\b",
    re.I
)
_TIMEZONE = re.compile(
    r"\b(all time[s]? (?:should be|in)|my time(zone)?|time in|timezone|"
    r"i(?:'m| am) in|local time|time zone)\b.*\b([A-Z]{2,5})\b",
    re.I
)
_REMINDER = re.compile(
    r"\b(remind me|set a reminder|alert me|notify me|reminder in|remind in|"
    r"remind after|check back|follow up|ping me)\b",
    re.I
)
# Detect time expressions like "in 3 days", "after 1 week", "in 2 hours"
_TIME_EXPR = re.compile(
    r"(?:in|after)\s+(\d+(?:\.\d+)?)\s*(minute|hour|day|week|month)s?",
    re.I
)


def classify(text: str) -> str:
    if _MEMORY_RECALL.search(text):
        return "memory_recall"
    if _MEMORY_FORGET.search(text):
        return "memory_forget"
    if _TIMEZONE.search(text):
        return "timezone_pref"
    if _MEMORY_SAVE.search(text):
        return "memory_save"
    if _DB_QUERY.search(text):
        return "db_query"
    if _CONFIG_UPDATE.search(text):
        return "config_update"
    if _MARKET_HOURS.search(text):
        return "market_hours"
    if _PAPER_TRADES.search(text):
        return "paper_trades"
    if _MARKET_PERFORMANCE.search(text):
        return "market_performance"
    if _REMINDER.search(text) or _TIME_EXPR.search(text):
        return "reminder"
    return "trading"


# ── Memory handlers ────────────────────────────────────────────────────────────

def handle_memory_save(text: str, conn: sqlite3.Connection, cfg) -> str:
    """Use LLM to extract key/value/category from the user's statement."""
    from src.analysis.trading_advisor import _call_llm
    prompt = f"""Extract the memory to save from this user message.
Return ONLY a JSON object with keys: "key", "value", "category".
Categories: trading_style | risk | preferences | portfolio | personal | general

Message: "{text}"

Example outputs:
{{"key": "trading_style", "value": "swing trader, holds 3-10 days", "category": "trading_style"}}
{{"key": "risk_tolerance", "value": "medium — willing to risk 2% per trade", "category": "risk"}}
{{"key": "preferred_instruments", "value": "forex majors and gold", "category": "preferences"}}

JSON only, no explanation:"""

    import json
    try:
        raw = _call_llm("You are a memory extraction assistant. Return only valid JSON.", prompt, cfg)
        raw = raw.strip().strip("```json").strip("```").strip()
        data = json.loads(raw)
        key = data.get("key", "note")[:60]
        value = data.get("value", text)[:500]
        category = data.get("category", "general")

        from src.db.memory import save_memory
        save_memory(conn, key, value, category)
        return f"Got it — I'll remember: *{key}*: {value}"
    except Exception as exc:
        log.error("Memory save failed: %s", exc)
        from src.db.memory import save_memory
        save_memory(conn, f"note_{len(text)}", text[:300], "general")
        return f"Saved: \"{text[:100]}\""


def handle_memory_recall(conn: sqlite3.Connection) -> str:
    from src.db.memory import get_all_memories
    memories = get_all_memories(conn)
    if not memories:
        return "I don't have anything stored about you yet. Tell me about your trading style, risk tolerance, or preferences and I'll remember them."

    lines = ["*What I know about you:*\n"]
    by_cat: Dict[str, list] = {}
    for m in memories:
        by_cat.setdefault(m["category"], []).append(f"• {m['key']}: {m['value']}")
    for cat, items in sorted(by_cat.items()):
        lines.append(f"_{cat.replace('_', ' ').title()}_")
        lines.extend(items)
        lines.append("")
    return "\n".join(lines)


def handle_memory_forget(text: str, conn: sqlite3.Connection, cfg) -> str:
    from src.db.memory import get_all_memories, delete_memory, clear_category
    if re.search(r"\b(everything|all|clear all)\b", text, re.I):
        memories = get_all_memories(conn)
        for m in memories:
            delete_memory(conn, m["key"])
        return "Done — I've cleared everything I knew about you."

    from src.analysis.trading_advisor import _call_llm
    import json
    memories = get_all_memories(conn)
    keys = [m["key"] for m in memories]
    prompt = f"""Given this user message: "{text}"
And these stored memory keys: {keys}
Which key should be deleted? Return ONLY the exact key string, or "none" if unclear."""
    try:
        key = _call_llm("Return only the exact key to delete, nothing else.", prompt, cfg).strip().strip('"')
        if key and key != "none" and delete_memory(conn, key):
            return f"Done — I've forgotten: *{key}*"
        return "I couldn't find that in my memory. Use /memory to see what I know."
    except Exception:
        return "Couldn't identify what to forget. Be more specific."


# ── Timezone preference handler ───────────────────────────────────────────────

def handle_timezone_pref(text: str, conn: sqlite3.Connection) -> str:
    """Save user's timezone preference and confirm."""
    from src.db.memory import save_memory

    # Extract the timezone abbreviation
    tz_map = {
        "EAT": "Africa/Nairobi",    # UTC+3
        "SAST": "Africa/Johannesburg",  # UTC+2
        "WAT": "Africa/Lagos",      # UTC+1
        "CAT": "Africa/Harare",     # UTC+2
        "EET": "Africa/Cairo",      # UTC+2
        "GMT": "GMT",
        "UTC": "UTC",
        "EST": "America/New_York",
        "ET": "America/New_York",
        "CST": "America/Chicago",
        "MST": "America/Denver",
        "PST": "America/Los_Angeles",
        "IST": "Asia/Kolkata",
        "JST": "Asia/Tokyo",
        "HKT": "Asia/Hong_Kong",
        "SGT": "Asia/Singapore",
        "CET": "Europe/Paris",
        "BST": "Europe/London",
        "AEST": "Australia/Sydney",
    }

    found_abbr = None
    for abbr in tz_map:
        if re.search(rf"\b{abbr}\b", text, re.I):
            found_abbr = abbr
            break

    if not found_abbr:
        return "I couldn't recognise the timezone abbreviation. Try: \"All times in EAT\" or \"My timezone is SAST\"."

    tz_name = tz_map[found_abbr]
    save_memory(conn, "timezone_abbr", found_abbr, "preferences")
    save_memory(conn, "timezone_name", tz_name, "preferences")
    return (
        f"Got it — I'll show all times in *{found_abbr}* ({tz_name}) from now on.\n"
        f"Market hours and reminders will use your local time."
    )


# ── Market performance handler ────────────────────────────────────────────────

def handle_market_performance(out_dir: Path, conn: sqlite3.Connection) -> str:
    """Pull yesterday's price moves from the DB price cache."""
    try:
        rows = conn.execute("""
            SELECT ticker, ret_1d, ret_1w, ret_1m, close
            FROM features
            ORDER BY abs(ret_1d) DESC
            LIMIT 20
        """).fetchall()
    except Exception:
        rows = []

    if not rows:
        # Fall back to brief context
        brief_path = out_dir / "brief_latest.json"
        if brief_path.exists():
            import json
            brief = json.loads(brief_path.read_text(encoding="utf-8"))
            macro = brief.get("macro_summary_simple") or brief.get("macro_summary", "")
            return f"*Latest Market Summary*\n\n{macro[:600]}"
        return "No market data available yet. Try /run to fetch the latest data."

    winners = [r for r in rows if (r["ret_1d"] or 0) > 0]
    losers  = [r for r in rows if (r["ret_1d"] or 0) < 0]

    lines = ["*Yesterday's Market Movers*\n"]
    if winners:
        lines.append("*Top gainers (1d):*")
        for r in winners[:5]:
            lines.append(f"  {r['ticker']:8s} +{r['ret_1d']*100:.2f}%  ${r['close']:.2f}")
    if losers:
        lines.append("\n*Top losers (1d):*")
        for r in sorted(losers, key=lambda x: x["ret_1d"])[:5]:
            lines.append(f"  {r['ticker']:8s} {r['ret_1d']*100:.2f}%  ${r['close']:.2f}")

    # Also pull from brief for macro colour
    brief_path = out_dir / "brief_latest.json"
    if brief_path.exists():
        import json
        brief = json.loads(brief_path.read_text(encoding="utf-8"))
        macro = (brief.get("macro_summary_simple") or "")[:300]
        if macro:
            lines.append(f"\n_{macro}_")

    return "\n".join(lines)


# ── Market hours handler ──────────────────────────────────────────────────────

def handle_market_hours(text: str, conn: sqlite3.Connection = None) -> str:
    """Return real-time market status using user's stored timezone (defaults to ET)."""
    from datetime import datetime, timedelta
    try:
        import pytz
    except ImportError:
        return "Install pytz (`pip install pytz`) for real-time market hours."

    # Read user's preferred timezone from memory
    user_tz_name = "America/New_York"
    user_tz_abbr = "ET"
    if conn:
        try:
            row = conn.execute(
                "SELECT value FROM user_memory WHERE key='timezone_name' LIMIT 1"
            ).fetchone()
            abbr_row = conn.execute(
                "SELECT value FROM user_memory WHERE key='timezone_abbr' LIMIT 1"
            ).fetchone()
            if row:
                user_tz_name = row["value"]
            if abbr_row:
                user_tz_abbr = abbr_row["value"]
        except Exception:
            pass

    et = pytz.timezone("America/New_York")
    user_tz = pytz.timezone(user_tz_name)

    now_utc = datetime.now(__import__("datetime").timezone.utc)
    now_et = now_utc.astimezone(et)
    now_local = now_utc.astimezone(user_tz)
    weekday = now_et.weekday()  # 0=Mon … 6=Sun

    market_open_t = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close_t = now_et.replace(hour=16, minute=0, second=0, microsecond=0)

    def _hm(secs: float) -> str:
        h, m = int(secs // 3600), int((secs % 3600) // 60)
        return f"{h}h {m}m" if h else f"{m}m"

    def _et_to_local(et_naive_str: str) -> str:
        """Convert 'HH:MM ET' label to user's local time."""
        h, m = map(int, et_naive_str.split(":"))
        dt_et = now_et.replace(hour=h, minute=m, second=0, microsecond=0)
        dt_local = dt_et.astimezone(user_tz)
        return dt_local.strftime(f"%H:%M {user_tz_abbr}")

    local_time_str = now_local.strftime(f"%a %d %b %H:%M {user_tz_abbr}")
    lines = [f"*Market Hours — now {local_time_str}*\n"]

    if weekday >= 5:
        days_to_mon = 7 - weekday
        next_open_et = (now_et + timedelta(days=days_to_mon)).replace(
            hour=9, minute=30, second=0, microsecond=0)
        delta = (next_open_et - now_et).total_seconds()
        next_local = next_open_et.astimezone(user_tz).strftime(f"%H:%M {user_tz_abbr}")
        lines.append("Weekend — markets closed.")
        lines.append(f"Next open: *Monday {next_local}* (in {_hm(delta)})")
    elif now_et < market_open_t:
        delta = (market_open_t - now_et).total_seconds()
        open_local = _et_to_local("09:30")
        lines.append(f"Pre-market. NYSE/NASDAQ opens in *{_hm(delta)}* ({open_local})")
        lines.append("Futures are trading. FX market is open 24/5.")
    elif now_et < market_close_t:
        delta = (market_close_t - now_et).total_seconds()
        close_local = _et_to_local("16:00")
        lines.append(f"Market is *OPEN* — closes in {_hm(delta)} ({close_local})")
        lines.append("After-hours trading runs until 20:00 ET.")
    else:
        days_ahead = 1
        next_open_et = now_et + timedelta(days=days_ahead)
        while next_open_et.weekday() >= 5:
            next_open_et += timedelta(days=1)
        next_open_et = next_open_et.replace(hour=9, minute=30, second=0, microsecond=0)
        delta = (next_open_et - now_et).total_seconds()
        next_local = next_open_et.astimezone(user_tz).strftime(f"%H:%M {user_tz_abbr}")
        day_name = next_open_et.strftime("%A")
        lines.append("Market closed for today.")
        lines.append(f"Next open: *{day_name} {next_local}* (in {_hm(delta)})")

    # Other markets — all converted to user's timezone
    def _mkt(name: str, open_utc: tuple, close_utc: tuple, tz_str: str) -> str:
        mtz = pytz.timezone(tz_str)
        o = now_utc.astimezone(mtz).replace(hour=open_utc[0], minute=open_utc[1], second=0, microsecond=0)
        c = now_utc.astimezone(mtz).replace(hour=close_utc[0], minute=close_utc[1], second=0, microsecond=0)
        o_local = o.astimezone(user_tz).strftime(f"%H:%M")
        c_local = c.astimezone(user_tz).strftime(f"%H:%M")
        return f"{name}: {o_local}–{c_local} {user_tz_abbr}"

    lines += [
        "",
        f"*Other markets (all in {user_tz_abbr}):*",
        _mkt("LSE (London)", (8, 0), (16, 30), "Europe/London"),
        _mkt("TSE (Tokyo)", (9, 0), (15, 30), "Asia/Tokyo"),
        _mkt("JSE (Joburg)", (9, 0), (17, 0), "Africa/Johannesburg"),
        _mkt("NSE (Nairobi)", (9, 0), (15, 0), "Africa/Nairobi"),
        "FX: 24/5 | Crypto: 24/7",
    ]
    return "\n".join(lines)


# ── Reminder handler ──────────────────────────────────────────────────────────

def handle_reminder(text: str, conn: sqlite3.Connection) -> str:
    """Parse a time expression from the message and schedule a reminder."""
    from datetime import datetime, timezone, timedelta
    from src.db.memory import save_reminder, list_pending_reminders

    # "show my reminders" / "list reminders"
    if re.search(r"\b(show|list|what are my|pending)\b.*reminder", text, re.I):
        pending = list_pending_reminders(conn)
        if not pending:
            return "You have no pending reminders."
        lines = ["*Pending Reminders:*"]
        for r in pending:
            lines.append(f"  • {r['due_at'][:16]} UTC — {r['message']}")
        return "\n".join(lines)

    m = _TIME_EXPR.search(text)
    if not m:
        return (
            "I couldn't find a time in your message. "
            "Try: \"Remind me in 3 days about the EUR/USD trade\" or \"Remind me after 1 week\"."
        )

    amount = float(m.group(1))
    unit = m.group(2).lower()
    unit_map = {"minute": 1/1440, "hour": 1/24, "day": 1, "week": 7, "month": 30}
    delta_days = amount * unit_map.get(unit, 1)
    due_dt = datetime.now(timezone.utc) + timedelta(days=delta_days)
    due_str = due_dt.isoformat(timespec="seconds")

    # Strip the time phrase to get the reminder subject
    subject = _TIME_EXPR.sub("", text)
    subject = re.sub(r"\b(remind me|set a reminder|alert me|notify me|then|and|after|in)\b", "", subject, flags=re.I)
    subject = re.sub(r"\s{2,}", " ", subject).strip(" .,;-")
    if not subject:
        subject = "your earlier request"

    save_reminder(conn, subject, due_str)
    friendly = due_dt.strftime("%A %d %b %Y at %H:%M UTC")
    return f"Reminder set! I'll ping you on *{friendly}* about: _{subject}_"


# ── DB query handler ───────────────────────────────────────────────────────────

def handle_db_query(text: str, conn: sqlite3.Connection) -> str:
    """Answer questions about the user's trade history from the DB."""
    results: list[str] = []

    # Win rate + stats
    if re.search(r"\b(win rate|performance|how am i|pnl|overall)\b", text, re.I):
        row = conn.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status='win' THEN 1 ELSE 0 END) as wins,
                   SUM(CASE WHEN status='loss' THEN 1 ELSE 0 END) as losses,
                   AVG(CASE WHEN pnl_pct IS NOT NULL THEN pnl_pct END) as avg_pnl
            FROM llm_ideas WHERE status != 'open'
        """).fetchone()
        if row and row["total"]:
            wr = row["wins"] / row["total"] * 100 if row["total"] else 0
            results.append(
                f"*LLM Idea Performance*\n"
                f"Total closed: {row['total']} | Wins: {row['wins']} | Losses: {row['losses']}\n"
                f"Win rate: {wr:.1f}% | Avg P&L: {(row['avg_pnl'] or 0):+.2f}%"
            )
        else:
            results.append("No closed trades scored yet — need more run history.")

    # Open trades
    if re.search(r"\b(open|current|active|my trades|positions)\b", text, re.I):
        rows = conn.execute("""
            SELECT ticker, direction, conviction, entry_date, entry_price_at_call, thesis
            FROM llm_ideas WHERE status = 'open' ORDER BY entry_date DESC LIMIT 10
        """).fetchall()
        if rows:
            lines = ["*Open LLM Ideas:*"]
            for r in rows:
                lines.append(
                    f"  {r['direction'].upper()} {r['ticker']} [{r['conviction']}] "
                    f"@ {r['entry_price_at_call']} — {(r['thesis'] or '')[:60]}"
                )
            results.append("\n".join(lines))
        else:
            results.append("No open ideas in DB.")

    # Recent trades / history
    if re.search(r"\b(history|recent|last|closed|scored)\b", text, re.I):
        rows = conn.execute("""
            SELECT ticker, direction, status, pnl_pct, entry_date, exit_price
            FROM llm_ideas WHERE status != 'open'
            ORDER BY entry_date DESC LIMIT 8
        """).fetchall()
        if rows:
            lines = ["*Recent Closed Ideas:*"]
            for r in rows:
                pnl = f"{r['pnl_pct']:+.1f}%" if r["pnl_pct"] is not None else "n/a"
                lines.append(
                    f"  {r['direction'].upper()} {r['ticker']} → {r['status'].upper()} {pnl} ({r['entry_date']})"
                )
            results.append("\n".join(lines))

    # Last run info
    if re.search(r"\b(last run|run history|when.*ran|last.*analysis|new data|since.*run)\b", text, re.I):
        row = conn.execute("""
            SELECT run_date, duration_secs, llm_model, signals_generated, win_rate_pct
            FROM runs ORDER BY id DESC LIMIT 1
        """).fetchone()
        if row:
            dur = row["duration_secs"] or 0
            wr = row["win_rate_pct"] or 0
            results.append(
                f"*Last Run:* {row['run_date']}\n"
                f"Duration: {dur:.0f}s | Model: {row['llm_model'] or 'n/a'}\n"
                f"Signals: {row['signals_generated'] or 0} | Win rate: {wr:.1f}%"
            )
        else:
            results.append("No runs logged yet.")

    return "\n\n".join(results) if results else "I couldn't find relevant data for that query."


# ── Config / watchlist handler ─────────────────────────────────────────────────

def handle_config_update(text: str, project_root: Path, cfg) -> str:
    """Add or remove tickers from the watchlist in config.yaml."""
    add_match = re.search(
        r"(?:add|watch|track)\s+([A-Z0-9.\-/]+)\s+(?:to|in)?\s*(?:my\s+)?(?:watchlist|watch list)",
        text, re.I
    )
    remove_match = re.search(
        r"(?:remove|unwatch|stop watching)\s+([A-Z0-9.\-/]+)",
        text, re.I
    )

    config_path = project_root / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    if add_match:
        ticker = add_match.group(1).upper()
        # Add to a "Custom" sector
        sectors = raw.get("sectors", {})
        sectors.setdefault("Custom", [])
        if ticker not in sectors["Custom"]:
            sectors["Custom"].append(ticker)
            raw["sectors"] = sectors
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.dump(raw, f, default_flow_style=False, allow_unicode=True)
            return f"Added *{ticker}* to your watchlist under Custom sector. It will be tracked on the next run."
        return f"*{ticker}* is already in your watchlist."

    if remove_match:
        ticker = remove_match.group(1).upper()
        sectors = raw.get("sectors", {})
        removed = False
        for sector, tickers in sectors.items():
            if ticker in tickers:
                tickers.remove(ticker)
                removed = True
        if removed:
            raw["sectors"] = sectors
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.dump(raw, f, default_flow_style=False, allow_unicode=True)
            return f"Removed *{ticker}* from your watchlist."
        return f"*{ticker}* wasn't found in your watchlist."

    return "I understood you want to update your watchlist but couldn't parse the ticker. Try: \"Add TSLA to my watchlist\""
