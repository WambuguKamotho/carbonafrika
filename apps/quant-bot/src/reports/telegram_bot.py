"""Two-way Telegram bot for the AI Quant Bot.

Runs a long-polling thread in the background so the user can query
the latest brief at any time. After each scheduled run main.py calls
`send_run_summary()` to push results automatically.

Commands:
  /start | /help        — list commands
  /brief                — plain-English macro summary
  /trades               — today's trade ideas (short + long term)
  /risk                 — risk flags
  /status               — last run stats & win rate
  /run                  — trigger a fresh pipeline run
  /analyze <symbol>     — live quote + analysis for any ticker
  <free text>           — ask anything about any market/instrument
"""
from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import requests

log = logging.getLogger(__name__)

_TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"
_MSG_LIMIT = 4000  # Telegram hard cap is 4096; leave buffer


class TelegramBot:
    def __init__(self, token: str, chat_id: str, out_dir: Path,
                 advisor=None, db_conn=None, cfg=None, project_root: Path | None = None):
        self.token = token
        self.chat_id = str(chat_id)
        self.out_dir = out_dir
        self.advisor = advisor
        self.db_conn = db_conn
        self.cfg = cfg
        self.project_root = project_root or out_dir.parent
        self._offset = self._load_offset()
        self._stop = threading.Event()
        self._run_callback: Optional[Callable] = None

    # ── Offset persistence (prevents duplicate messages on restart) ────────────

    def _offset_path(self) -> Path:
        return self.out_dir / ".tg_offset"

    def _load_offset(self) -> int:
        try:
            p = self.out_dir / ".tg_offset"
            if p.exists():
                return int(p.read_text().strip())
        except Exception:
            pass
        return 0

    def _save_offset(self, offset: int):
        try:
            self._offset_path().write_text(str(offset))
        except Exception:
            pass

    # ── Low-level API ──────────────────────────────────────────────────────────

    def _url(self, method: str) -> str:
        return _TELEGRAM_API.format(token=self.token, method=method)

    def send(self, text: str, parse_mode: str = "Markdown") -> bool:
        """Send a message to the owner chat. Splits if too long.
        Falls back to plain text if Markdown parsing fails."""
        chunks = [text[i:i + _MSG_LIMIT] for i in range(0, len(text), _MSG_LIMIT)]
        ok = True
        for chunk in chunks:
            payload: Dict[str, Any] = {"chat_id": self.chat_id, "text": chunk}
            if parse_mode:
                payload["parse_mode"] = parse_mode
            try:
                resp = requests.post(self._url("sendMessage"), json=payload, timeout=4)
                if not resp.ok:
                    if parse_mode and "can't parse" in resp.text.lower():
                        # Retry as plain text — LLM output often has unbalanced Markdown
                        plain = {"chat_id": self.chat_id, "text": chunk}
                        resp = requests.post(self._url("sendMessage"), json=plain, timeout=4)
                    if not resp.ok:
                        log.warning("Telegram sendMessage error: %s", resp.text[:200])
                        ok = False
            except Exception as exc:
                log.error("Telegram send failed: %s", exc)
                ok = False
        return ok

    def _get_updates(self) -> List[Dict[str, Any]]:
        try:
            resp = requests.get(
                self._url("getUpdates"),
                params={"offset": self._offset, "timeout": 30, "allowed_updates": ["message"]},
                timeout=40,
            )
            if resp.ok:
                return resp.json().get("result", [])
        except Exception as exc:
            log.debug("getUpdates error: %s", exc)
        return []

    # ── Data helpers ───────────────────────────────────────────────────────────

    def _load_latest_brief(self) -> Optional[Dict[str, Any]]:
        """Return parsed brief JSON from the most recent run."""
        path = self.out_dir / "brief_latest.json"
        if not path.exists():
            # Fallback: find newest brief_*.json
            candidates = sorted(self.out_dir.glob("brief_*.json"))
            if not candidates:
                return None
            path = candidates[-1]
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _load_paper_stats(self) -> Optional[Dict[str, Any]]:
        path = self.out_dir / "paper_stats_latest.json"
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                pass
        return None

    # ── Command handlers ───────────────────────────────────────────────────────

    def _cmd_help(self):
        self.send(
            "*Quant Bot — Commands*\n\n"
            "/paper — open paper trades with live P&L\n"
            "/paper closed — completed paper trades\n"
            "/suggest — full evidence-backed trade cards (entry, stop, target, live price, R:R)\n"
            "/suggest NVDA — evidence card for one ticker\n"
            "/brief — macro summary in plain English\n"
            "/trades — today's trade ideas\n"
            "/risk — risk flags\n"
            "/status — last run stats & win rate\n"
            "/run — trigger a fresh pipeline run\n"
            "_Auto-runs: 09:00, 16:30, 23:00 EAT daily_\n"
            "_Price alerts: automatic on moves >2.5% intraday_\n"
            "/diagnose — read recent logs and get AI improvement suggestions\n"
            "/service — manage Docker container\n"
            "  /service status — is the bot running?\n"
            "  /service restart — restart the bot container\n"
            "  /service logs — last 30 lines of output\n"
            "/congress — US politician stock trades (STOCK Act)\n"
            "/congress NVDA — trades on a specific ticker\n"
            "/analyze EURUSD — live quote + analysis\n"
            "/options AAPL — IV rank, Greeks, strategy recommendation\n"
            "/iv SPY — quick implied volatility check\n"
            "/backtest — signal performance (Sharpe, win rate, max drawdown)\n"
            "/backtest sector_momentum_long — specific signal detail\n"
            "/etf SPY — ETF top holdings, AUM, NAV premium/discount\n"
            "/surprise — Economic Surprise Index (is macro data beating trend?)\n"
            "/earnings — recent earnings tone from SEC 8-K filings\n"
            "/earnings NVDA — tone for a specific ticker\n"
            "/memory — what I know about you\n"
            "/reminders — pending reminders\n"
            "/help — this message\n\n"
            "*Or just ask anything:*\n"
            "\"What do you think about gold?\"\n"
            "\"Is EUR/USD a buy right now?\"\n"
            "\"Explain iron condor options strategy\"\n"
            "\"Best ETFs for emerging markets?\""
        )

    def _cmd_options(self, args: str):
        """Full options snapshot: IV rank, Greeks, strategy recommendation."""
        from src.data.options_flow import get_single_options_snapshot
        ticker = args.strip().upper()
        if not ticker:
            self.send("Usage: /options <ticker>\nExample: /options AAPL  /options SPY  /options TSLA")
            return
        self.send(f"Fetching options data for {ticker}...")
        snap = get_single_options_snapshot(ticker)
        if not snap:
            self.send(f"No options data found for {ticker}. It may not have listed options.")
            return

        greeks = snap.get("greeks") or {}
        strat = snap.get("recommended_strategy") or {}
        lines = [
            f"*{ticker} Options Snapshot*",
            f"Spot: ${snap.get('spot', 'n/a')} | Expiry: {snap.get('expiry', 'n/a')}",
            f"ATM Strike: {snap.get('atm_strike', 'n/a')}",
            "",
            f"*Volatility*",
            f"ATM IV: {snap.get('atm_iv_pct', 'n/a')}%",
            f"IV Rank: {snap.get('iv_rank', 'n/a')} | IV Percentile: {snap.get('iv_percentile', 'n/a')}",
            f"IV Skew (put-call): {snap.get('iv_skew_pct', 'n/a')}%",
            "",
            f"*Flow*",
            f"Put/Call Vol: {snap.get('put_call_vol_ratio', 'n/a')} | Signal: {snap.get('signal', 'n/a')}",
            f"Call Vol: {snap.get('call_volume', 0):,} | Put Vol: {snap.get('put_volume', 0):,}",
            f"Unusual Volume: {'Yes' if snap.get('unusual_volume') else 'No'}",
        ]
        if greeks:
            lines += [
                "",
                f"*ATM Greeks (Call)*",
                f"Delta: {greeks.get('delta', 'n/a')} | Gamma: {greeks.get('gamma', 'n/a')}",
                f"Theta: {greeks.get('theta', 'n/a')}/day | Vega: {greeks.get('vega', 'n/a')}/1% IV",
            ]
        if strat:
            lines += [
                "",
                f"*Recommended Strategy*",
                f"{strat.get('strategy', '')}",
                f"{strat.get('rationale', '')}",
                f"Risk: {strat.get('risk', '')}",
            ]
        self.send("\n".join(lines))

        if self.advisor:
            analysis = self.advisor.ask(
                f"Given this options data for {ticker}, explain the best trading approach "
                f"and any key risks an options trader should watch.",
                quote_context="\n".join(lines),
            )
            self.send(analysis)

    def _cmd_iv(self, args: str):
        """Quick IV rank + skew check for any ticker."""
        from src.data.options_flow import get_single_options_snapshot
        ticker = args.strip().upper()
        if not ticker:
            self.send("Usage: /iv <ticker>\nExample: /iv SPY")
            return
        self.send(f"Checking IV for {ticker}...")
        snap = get_single_options_snapshot(ticker)
        if not snap:
            self.send(f"No options data for {ticker}.")
            return
        ivr = snap.get("iv_rank")
        ivp = snap.get("iv_percentile")
        atm_iv = snap.get("atm_iv_pct")
        skew = snap.get("iv_skew_pct")

        if ivr is not None:
            if ivr > 70:
                iv_regime = "HIGH — consider selling premium (iron condor, covered call)"
            elif ivr < 30:
                iv_regime = "LOW — consider buying options (calls, puts, straddles)"
            else:
                iv_regime = "NEUTRAL — spreads or directional plays"
        else:
            iv_regime = "unknown"

        self.send(
            f"*{ticker} IV Summary*\n"
            f"ATM IV: {atm_iv}%\n"
            f"IV Rank: {ivr} | IV Percentile: {ivp}\n"
            f"Skew: {skew:+.1f}% (+ = puts more expensive)\n\n"
            f"Regime: {iv_regime}"
            if skew is not None else
            f"*{ticker} IV Summary*\n"
            f"ATM IV: {atm_iv}%\n"
            f"IV Rank: {ivr} | IV Percentile: {ivp}\n\n"
            f"Regime: {iv_regime}"
        )

    def _cmd_analyze(self, args: str):
        """Fetch live quote + LLM analysis for any symbol."""
        from src.data.quick_quote import get_quote, format_quote
        ticker = args.strip()
        if not ticker:
            self.send("Usage: /analyze <symbol>\nExamples: /analyze EURUSD  /analyze AAPL  /analyze BTC  /analyze Gold")
            return

        self.send(f"Fetching {ticker.upper()}...")
        quote = get_quote(ticker)
        if not quote:
            self.send(f"Could not find data for *{ticker.upper()}*. Try a different symbol (e.g. EURUSD, AAPL, BTC-USD, GC=F)")
            return

        quote_text = format_quote(quote)
        self.send(quote_text)

        if self.advisor:
            self.send("_Analysing..._", parse_mode="Markdown")
            analysis = self.advisor.ask(
                f"Give me a trading analysis for {ticker.upper()}. "
                f"Include trend direction, key levels, outlook, and specific risks.",
                quote_context=quote_text,
            )
            self.send(analysis)

    def _handle_freetext(self, text: str):
        """Classify intent and route to the right handler."""
        from src.analysis.intent_router import (
            classify, handle_memory_save, handle_memory_recall,
            handle_memory_forget, handle_db_query, handle_config_update,
            handle_reminder, handle_market_hours, handle_timezone_pref,
            handle_market_performance,
        )
        from src.db.memory import log_conversation

        intent = classify(text)
        response = ""

        try:
            if intent == "memory_recall":
                response = handle_memory_recall(self.db_conn)

            elif intent == "timezone_pref":
                response = handle_timezone_pref(text, self.db_conn)

            elif intent == "memory_save":
                self.send("_Saving to memory..._", parse_mode="Markdown")
                response = handle_memory_save(text, self.db_conn, self.cfg)

            elif intent == "memory_forget":
                response = handle_memory_forget(text, self.db_conn, self.cfg)

            elif intent == "db_query":
                response = handle_db_query(text, self.db_conn)

            elif intent == "config_update":
                response = handle_config_update(text, self.project_root, self.cfg)

            elif intent == "market_hours":
                response = handle_market_hours(text, self.db_conn)

            elif intent == "paper_trades":
                # Route conversational paper trade queries to the /paper handler
                self._cmd_paper("")
                if self.db_conn:
                    log_conversation(self.db_conn, text, "[paper trades shown]", intent)
                return

            elif intent == "market_performance":
                response = handle_market_performance(self.out_dir, self.db_conn)

            elif intent == "reminder":
                response = handle_reminder(text, self.db_conn)

            else:
                # Default: trading advisor — also chain a reminder if time expr present
                if not self.advisor:
                    self.send("Trading advisor not available. Check LLM config.")
                    return
                from src.analysis.intent_router import _TIME_EXPR, handle_reminder
                from src.data.quick_quote import get_quote, format_quote
                import re as _re

                has_reminder = bool(_TIME_EXPR.search(text))

                # Auto-detect any ticker mentioned and inject live quote so LLM
                # doesn't have to guess prices
                ticker_match = _re.search(
                    r'\b([A-Z]{1,5}(?:[=-][A-Z]+)?(?:USD|EUR|GBP|JPY|=X|=F|-USD)?)\b', text
                )
                quote_ctx = ""
                if ticker_match:
                    candidate = ticker_match.group(1)
                    # Skip common English words that match the pattern
                    _SKIP = {"I", "A", "THE", "IS", "ARE", "BUY", "SELL", "NOW",
                             "FOR", "AND", "OR", "NOT", "ANY", "ALL", "TO", "IN",
                             "AT", "BY", "IF", "BE", "DO", "GO", "MY", "WE", "US"}
                    if candidate not in _SKIP and len(candidate) >= 2:
                        q = get_quote(candidate)
                        if q:
                            quote_ctx = format_quote(q)

                self.send("_Thinking..._", parse_mode="Markdown")
                response = self.advisor.ask(text, quote_context=quote_ctx)

                # Append data-freshness note if no live quote was found
                if not quote_ctx:
                    brief_path = self.out_dir / "brief_latest.json"
                    if brief_path.exists():
                        import json
                        from datetime import datetime, timezone
                        try:
                            b = json.loads(brief_path.read_text(encoding="utf-8"))
                            as_of = b.get("as_of", "")[:10]
                            if as_of:
                                response += f"\n\n_⚠ Price levels above are from the {as_of} analysis — verify current prices before trading._"
                        except Exception:
                            pass

                if has_reminder:
                    reminder_resp = handle_reminder(text, self.db_conn)
                    response = response + "\n\n" + reminder_resp

        except Exception as exc:
            log.error("freetext handler error: %s", exc)
            response = f"Something went wrong: {exc}"

        self.send(response)

        # Log the conversation
        if self.db_conn:
            try:
                log_conversation(self.db_conn, text, response, intent)
            except Exception:
                pass

    def _cmd_paper(self, args: str):
        """Show all paper trades with live P&L, grouped by signal."""
        if not self.db_conn:
            self.send("DB not connected.")
            return

        from src.data.quick_quote import get_quote

        # Parse optional filter: /paper open | /paper closed | /paper spx
        arg = args.strip().lower()
        if arg in ("closed", "history", "scored"):
            status_filter = "status IN ('win','loss')"
            title = "Paper Trades — Closed"
        else:
            status_filter = "status='open'"
            title = "Paper Trades — Open Positions"

        rows = self.db_conn.execute(f"""
            SELECT id, signal_name, ticker, direction, confidence,
                   entry_date, entry_price, hold_days, rationale, status, pnl_pct
            FROM paper_trades WHERE {status_filter}
            ORDER BY signal_name, ticker
        """).fetchall()

        if not rows:
            self.send(f"No {arg or 'open'} paper trades found.")
            return

        # Summary stats line
        total = len(rows)
        if arg in ("closed", "history", "scored"):
            wins = sum(1 for r in rows if r["status"] == "win")
            avg_pnl = sum(r["pnl_pct"] or 0 for r in rows) / total if total else 0
            header = (
                f"*{title}* ({total} trades)\n"
                f"Win rate: {wins}/{total} = {wins/total*100:.1f}%  |  Avg P&L: {avg_pnl:+.2f}%"
            )
        else:
            header = f"*{title}* ({total} unique positions)\n_Fetching live prices…_"

        self.send(header)

        # Fetch live prices once per unique ticker
        tickers = list({r["ticker"] for r in rows})
        live: dict = {}
        price_failures = 0
        for tk in tickers:
            q = get_quote(tk)
            if q:
                live[tk] = q["last"]
            else:
                price_failures += 1

        if price_failures and arg not in ("closed", "history", "scored"):
            self.send(
                f"⚠️ _{price_failures} ticker(s) returned no live price — P&L shown as n/a for those._",
                parse_mode="Markdown",
            )

        # Group by signal for open; flat list for closed
        if arg not in ("closed", "history", "scored"):
            from itertools import groupby
            sorted_rows = sorted(rows, key=lambda r: r["signal_name"])
            lines = []
            for sig_name, group in groupby(sorted_rows, key=lambda r: r["signal_name"]):
                lines.append(f"\n*{sig_name.replace('_', ' ').title()}*")
                for r in group:
                    tk = r["ticker"]
                    ep = r["entry_price"] or 0
                    cur = live.get(tk)
                    if cur and ep:
                        raw = (cur - ep) / ep
                        pnl = (raw if r["direction"] == "long" else -raw) * 100
                        pnl_str = f"{pnl:+.2f}%"
                        cur_str = f"${cur:,.2f}"
                    else:
                        pnl_str = "n/a"
                        cur_str = "n/a"
                    dir_arrow = "↑" if r["direction"] == "long" else "↓"
                    hold = r["hold_days"] or 5
                    lines.append(
                        f"  {dir_arrow} {tk}  entry ${ep:,.2f} → now {cur_str}  P&L: {pnl_str}"
                        f"  [{r['confidence'] or '?'}] hold {hold}d"
                    )
                    lines.append(f"    _{r['rationale'][:80] if r['rationale'] else ''}_")
            self.send("\n".join(lines))
        else:
            lines = [""]
            for r in rows:
                status_icon = "✅" if r["status"] == "win" else "❌"
                pnl = r["pnl_pct"]
                pnl_str = f"{pnl:+.2f}%" if pnl is not None else "n/a"
                lines.append(
                    f"{status_icon} {r['direction'].upper()} {r['ticker']}  "
                    f"P&L: {pnl_str}  ({r['entry_date']})"
                )
            self.send("\n".join(lines))

        # Footer with commands
        self.send(
            "_/paper open — open positions with live P&L_\n"
            "_/paper closed — completed trades_"
            if arg not in ("closed", "history", "scored")
            else "_/paper — see open positions_",
            parse_mode="Markdown"
        )

    def _cmd_suggest(self, args: str):
        """Full evidence-backed trade card for each idea — ready to present."""
        from datetime import datetime, timezone
        brief = self._load_latest_brief()
        if not brief:
            self.send("No brief yet. Run /run first.")
            return

        # Staleness check — warn if brief is older than 4 hours
        brief_date = brief.get("as_of", "")
        staleness_note = ""
        try:
            brief_dt = datetime.fromisoformat(brief_date.replace("Z", "+00:00"))
            age_h = (datetime.now(timezone.utc) - brief_dt).total_seconds() / 3600
            if age_h > 4:
                staleness_note = (
                    f"⚠️ *Brief is {age_h:.0f}h old* (from {brief_date[:10]}) — "
                    f"entry zones, stops and targets may be stale. Run /run to refresh.\n\n"
                )
        except Exception:
            staleness_note = f"⚠️ *Analysis from {brief_date[:10]}* — verify prices before trading.\n\n"

        if staleness_note:
            self.send(staleness_note)

        from src.data.quick_quote import get_quote

        # Collect all ideas
        all_ideas = (brief.get("short_term_ideas") or []) + (brief.get("long_term_ideas") or [])
        if not all_ideas:
            self.send("No trade ideas in the latest brief. Try /run.")
            return

        # Filter by ticker arg if provided
        if args.strip():
            filter_tk = args.strip().upper()
            all_ideas = [i for i in all_ideas if i.get("ticker", "").upper() == filter_tk]
            if not all_ideas:
                self.send(f"No ideas found for {filter_tk}. Use /suggest alone to see all.")
                return

        # Sector stance lookup
        sector_map = {s.get("sector", ""): s for s in (brief.get("sector_calls") or [])}

        # Regime context
        regime_line = ""
        if self.db_conn:
            try:
                row = self.db_conn.execute(
                    "SELECT vix_spot, vix_regime, yield_curve_state, sector_leader FROM regimes ORDER BY date DESC LIMIT 1"
                ).fetchone()
                if row:
                    regime_line = (
                        f"Regime: VIX {row['vix_spot']:.1f} ({row['vix_regime']}) | "
                        f"Yield curve {row['yield_curve_state']} | Leader: {row['sector_leader']}"
                    )
            except Exception:
                pass

        # Risk flags summary
        flags = brief.get("risk_flags") or []
        risk_line = " | ".join(
            f"[{f.get('severity','?').upper()}] {f.get('flag', f.get('description',''))}"
            for f in flags[:3]
        ) if flags else ""

        # Header
        date = brief.get("as_of", "")[:10]
        header = [f"*Trade Suggestions — {date}*"]
        if regime_line:
            header.append(f"_{regime_line}_")
        if risk_line:
            header.append(f"_Risks: {risk_line}_")
        self.send("\n".join(header))

        # One card per idea (limit 6 to avoid spam)
        for idea in all_ideas[:6]:
            tk = idea.get("ticker", "")
            direction = idea.get("direction", "").upper()
            horizon = idea.get("horizon", "").replace("_", " ")
            conviction = idea.get("conviction", "").upper()
            thesis = idea.get("thesis", "")
            entry_zone = idea.get("entry_zone", "")
            stop_loss = idea.get("stop_loss", "")
            target = idea.get("target", "")
            catalysts = idea.get("catalysts") or []

            dir_emoji = "📈" if direction == "LONG" else "📉"

            # Live price
            self.send(f"_Fetching live data for {tk}…_", parse_mode="Markdown")
            quote = get_quote(tk)
            if quote:
                price = quote["last"]
                chg_1d = quote["chg_1d_pct"]
                chg_1w = quote["chg_1w_pct"]
                w52h = quote.get("week52_high")
                w52l = quote.get("week52_low")
                price_line = f"Live: ${price:,.2f}  ({chg_1d:+.2f}% 1d | {chg_1w:+.2f}% 1w)"

                # Position vs 52w range
                if w52h and w52l and w52h != w52l:
                    pct_of_range = (price - w52l) / (w52h - w52l) * 100
                    range_line = f"52w range: ${w52l:,.2f}–${w52h:,.2f} | Now at {pct_of_range:.0f}% of range"
                else:
                    range_line = ""

                # Compare live price to entry zone
                position_note = ""
                if entry_zone and price:
                    try:
                        parts = entry_zone.replace("$", "").split("-")
                        lo, hi = float(parts[0]), float(parts[-1])
                        if price < lo:
                            position_note = f"Price BELOW entry zone by ${lo-price:.2f} — not yet at entry"
                        elif price > hi:
                            position_note = f"Price ABOVE entry zone by ${price-hi:.2f} — may be extended"
                        else:
                            position_note = "Price IN entry zone — setup active"
                    except Exception:
                        pass
            else:
                price_line = "Live price unavailable"
                range_line = ""
                position_note = ""

            # Sector context for this ticker
            sector_lines = []
            for sc in (brief.get("sector_calls") or []):
                drivers = sc.get("key_drivers") or []
                if any(tk in d for d in drivers) or tk in sc.get("rationale", ""):
                    stance = sc.get("stance", "neutral").upper()
                    sector_lines.append(
                        f"Sector ({sc.get('sector')}): {stance} — {sc.get('rationale','')[:80]}"
                    )

            # Build the card
            lines = [
                f"{dir_emoji} *{tk}* — {direction} | {horizon} | Conviction: {conviction}",
                "",
                f"*Thesis:* {thesis}",
                "",
                price_line,
            ]
            if range_line:
                lines.append(range_line)
            if position_note:
                lines.append(f"*{position_note}*")
            lines.append("")
            if entry_zone:
                lines.append(f"Entry zone: ${entry_zone} _(as of {date})_")
            if stop_loss:
                lines.append(f"Stop loss: ${stop_loss} _(as of {date})_")
            if target:
                lines.append(f"Target: ${target} _(as of {date})_")
                # Risk:reward
                try:
                    price_now = quote["last"] if quote else None
                    sl = float(stop_loss.replace("$","").split("-")[0])
                    tgt = float(target.replace("$","").split("-")[0])
                    if price_now:
                        risk = abs(price_now - sl)
                        reward = abs(tgt - price_now)
                        if risk > 0:
                            lines.append(f"Risk/Reward: 1:{reward/risk:.1f}")
                except Exception:
                    pass
            if catalysts:
                lines.append(f"Catalysts: {', '.join(catalysts)}")
            for sl in sector_lines:
                lines.append(sl)

            self.send("\n".join(lines))

    def _cmd_brief(self):
        brief = self._load_latest_brief()
        if not brief:
            self.send("No brief available yet. Try /run first.")
            return
        date = brief.get("as_of", "")[:10]
        summary = brief.get("macro_summary_simple") or brief.get("macro_summary", "")
        closing = brief.get("closing_note", "")
        parts = [f"*Macro Summary — {date}*\n\n{summary}"]
        if closing:
            parts.append(f"\n_{closing}_")
        self.send("\n".join(parts))

    def _cmd_trades(self):
        brief = self._load_latest_brief()
        if not brief:
            self.send("No brief available yet. Try /run first.")
            return
        date = brief.get("as_of", "")[:10]
        lines = [f"*Trade Ideas — {date}*"]

        st = brief.get("short_term_ideas", [])
        if st:
            lines.append("\n*Short-Term (days–weeks):*")
            for idea in st[:5]:
                direction = idea.get("direction", "")
                ticker = idea.get("ticker", "")
                thesis = idea.get("thesis", "")[:120]
                conviction = idea.get("conviction", "")
                lines.append(f"  {direction} {ticker} [{conviction}] — {thesis}")

        lt = brief.get("long_term_ideas", [])
        if lt:
            lines.append("\n*Long-Term (months):*")
            for idea in lt[:3]:
                direction = idea.get("direction", "")
                ticker = idea.get("ticker", "")
                thesis = idea.get("thesis", "")[:120]
                conviction = idea.get("conviction", "")
                lines.append(f"  {direction} {ticker} [{conviction}] — {thesis}")

        sector_calls = brief.get("sector_calls", [])
        if sector_calls:
            lines.append("\n*Sector Calls:*")
            for sc in sector_calls[:5]:
                lines.append(f"  {sc.get('sector')} — {sc.get('stance')} ({sc.get('rationale','')[:80]})")

        self.send("\n".join(lines))

    def _cmd_risk(self):
        brief = self._load_latest_brief()
        if not brief:
            self.send("No brief available yet. Try /run first.")
            return
        date = brief.get("as_of", "")[:10]
        flags = brief.get("risk_flags", [])
        if not flags:
            self.send(f"*Risk Flags — {date}*\n\nNo significant risks flagged.")
            return
        lines = [f"*Risk Flags — {date}*\n"]
        for f in flags:
            severity = f.get("severity", "").upper()
            description = f.get("description", "")
            lines.append(f"  [{severity}] {description}")
        self.send("\n".join(lines))

    def _cmd_status(self):
        brief = self._load_latest_brief()
        stats = self._load_paper_stats()
        lines = ["*Bot Status*\n"]
        if brief:
            lines.append(f"Last run: {brief.get('as_of','')[:10]}")
        else:
            lines.append("Last run: never")
        if stats:
            lines.append(f"Win rate: {stats.get('win_rate_pct', 0):.1f}%")
            lines.append(f"Total trades scored: {stats.get('total_trades', 0)}")
            lines.append(f"Avg P&L: {stats.get('avg_pnl_pct', 0):+.2f}%")
            lines.append(f"New signals today: {stats.get('new_signals_today', 0)}")
        else:
            lines.append("No performance stats yet.")
        self.send("\n".join(lines))

    def _cmd_diagnose(self):
        """Read recent run logs, extract issues, ask LLM for improvement suggestions."""
        import re as _re
        from pathlib import Path

        log_dir = self.project_root / "logs"
        all_logs = sorted(log_dir.glob("run_*.log"), reverse=True)
        if not all_logs:
            self.send("No run logs found yet. Run /run first.")
            return

        self.send("_Reading logs and analysing..._", parse_mode="Markdown")

        # Collect relevant lines from last 5 runs
        issues: list[str] = []
        run_times: list[str] = []
        seen: set[str] = set()

        for log_path in all_logs[:5]:
            text = log_path.read_text(encoding="utf-8", errors="replace")
            lines = text.splitlines()

            # Extract run duration
            for line in lines:
                if "Run complete in" in line:
                    m = _re.search(r"Run complete in ([\d.]+)s", line)
                    if m:
                        run_times.append(f"{log_path.name}: {m.group(1)}s")

            # Extract errors, warnings, timeouts — deduplicate by message body
            for line in lines:
                if not _re.search(r"ERROR|WARNING|timed out|timeout|429|rate limit|failed|skipping", line, _re.I):
                    continue
                # Strip timestamp prefix to deduplicate similar lines
                body = _re.sub(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+ \| \w+ +\| \S+ +\| ", "", line)
                body = body[:200]
                key = _re.sub(r"0x[0-9a-f]+|timeout=\d+|\d{4}-\d{2}-\d{2}T\S+", "X", body)
                if key not in seen:
                    seen.add(key)
                    issues.append(f"[{log_path.name[:19]}] {body}")

        # Service stderr
        svc_stderr = log_dir / "service_stderr.log"
        if svc_stderr.exists():
            stderr_lines = svc_stderr.read_text(encoding="utf-8", errors="replace").splitlines()[-30:]
            for line in stderr_lines:
                if _re.search(r"Error|Traceback|Exception", line, _re.I):
                    issues.append(f"[service_stderr] {line[:200]}")

        if not issues and not run_times:
            self.send("No errors or warnings found in the last 5 runs. Everything looks clean.")
            return

        # Build prompt for LLM
        run_time_str = "\n".join(run_times) if run_times else "unknown"
        issues_str = "\n".join(issues[:60]) if issues else "none"

        prompt = f"""You are a code improvement advisor for an AI quantitative trading bot built in Python.

Analyse these log extracts from the last 5 runs and provide:
1. A short summary of the most critical recurring issues (max 3 bullets)
2. Specific, actionable code fixes or config changes for each issue
3. Any performance improvements suggested by the run times

Run durations:
{run_time_str}

Log issues extracted (errors, warnings, timeouts):
{issues_str}

Keep the response under 300 words. Be specific — name the file/module to fix."""

        if not self.cfg:
            # No LLM — just show raw issues
            out = ["*Recent log issues:*\n"]
            out += [f"• {i}" for i in issues[:20]]
            self.send("\n".join(out))
            return

        from src.analysis.trading_advisor import _call_llm
        analysis = _call_llm(
            "You are a Python debugging and code improvement assistant. Be concise and specific.",
            prompt,
            self.cfg,
        )

        # Also show raw issue count summary
        header = f"*Diagnose — last {min(5, len(all_logs))} runs*\n"
        header += f"Run times: {' | '.join(run_times)}\n"
        header += f"Unique issues found: {len(issues)}\n\n"
        self.send(header + analysis)

    def _cmd_congress(self, args: str):
        """Show recent US politician stock trades from STOCK Act disclosures."""
        from src.data.congress_trades import gather_congress_trades, summarise_by_ticker

        arg = args.strip().upper()
        self.send("_Fetching congressional disclosures…_", parse_mode="Markdown")

        trades = gather_congress_trades(days_back=30, limit=100)
        if not trades:
            self.send("No recent congressional trades found (or data source is down). Try again later.")
            return

        # Filter by ticker if arg given
        if arg:
            trades = [t for t in trades if t.get("ticker") == arg]
            if not trades:
                self.send(f"No congressional trades found for *{arg}* in the last 30 days.")
                return

            lines = [f"*Congressional trades — {arg} (last 30 days)*\n"]
            for t in trades[:15]:
                direction = "🟢 BUY" if "purchase" in t.get("trade_type", "").lower() else "🔴 SELL"
                lines.append(
                    f"{direction} {t['name']} ({t.get('party','?')}-{t.get('state','?')}, {t.get('chamber','')})\n"
                    f"  Amount: {t.get('amount','?')}  |  {t.get('trade_date','?')}"
                )
            self.send("\n".join(lines))
            return

        # Default: show top tickers by activity + recent trades
        by_ticker = summarise_by_ticker(trades)
        lines = [f"*Congressional Trades — Last 30 Days* ({len(trades)} disclosures)\n"]

        lines.append("*Most traded tickers:*")
        for r in by_ticker[:10]:
            tk = r["ticker"]
            buys = r["buys"]
            sells = r["sells"]
            pols = ", ".join(r["politicians"][:3])
            lines.append(f"  *{tk}* — {buys}🟢 {sells}🔴  |  {pols}")

        lines.append("\n*Recent disclosures:*")
        for t in trades[:10]:
            direction = "🟢" if "purchase" in t.get("trade_type", "").lower() else "🔴"
            lines.append(
                f"{direction} {t['name']} → *{t['ticker']}* {t.get('amount','?')}  ({t.get('trade_date','?')})"
            )

        lines.append("\n_/congress NVDA — trades for a specific ticker_")
        self.send("\n".join(lines))

    def _cmd_run(self):
        if self._run_callback:
            self.send("Starting a fresh run... this takes ~3 minutes. I'll message you when it's done.")
            threading.Thread(
                target=self._run_callback, daemon=True, name="telegram-triggered-run"
            ).start()
        else:
            self.send("Run callback not wired up. Check bot setup.")

    # ── Service management (Docker) ────────────────────────────────────────────

    def _cmd_service(self, args: str):
        """Docker container management from Telegram: status | restart | logs"""
        import subprocess, shutil

        sub = args.strip().lower() or "status"
        docker = shutil.which("docker")

        if sub == "status":
            if docker:
                try:
                    result = subprocess.run(
                        [docker, "compose", "ps", "--format", "json"],
                        capture_output=True, text=True, timeout=10,
                        cwd=str(self.project_root),
                    )
                    self.send(f"*Docker status:*\n```\n{(result.stdout or result.stderr).strip()[:3000]}\n```")
                except Exception as e:
                    self.send(f"Could not get status: {e}")
            else:
                import os, socket
                self.send(
                    f"*Bot status:* running\n"
                    f"*Host:* {socket.gethostname()}\n"
                    f"*PID:* {os.getpid()}"
                )

        elif sub == "restart":
            self.send("Restarting container — I'll be back in ~10 seconds...")
            def _do_restart():
                import time
                time.sleep(1)
                if docker:
                    subprocess.run(
                        [docker, "compose", "restart", "bot"],
                        timeout=30, cwd=str(self.project_root),
                    )
            threading.Thread(target=_do_restart, daemon=True).start()

        elif sub == "logs":
            log_files = sorted((self.project_root / "logs").glob("*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
            if not log_files:
                self.send("No log files found yet.")
                return
            try:
                lines = log_files[0].read_text(encoding="utf-8", errors="replace").splitlines()
                tail = "\n".join(lines[-30:])
                self.send(f"*Last 30 log lines ({log_files[0].name}):*\n```\n{tail[-3500:]}\n```")
            except Exception as e:
                self.send(f"Could not read logs: {e}")

        else:
            self.send(
                "*Service commands:*\n"
                "/service status — container status\n"
                "/service restart — restart the bot container\n"
                "/service logs — show recent log output"
            )

    def _cmd_backtest(self, args: str):
        """Signal backtest — Sharpe, win rate, max drawdown."""
        if not self.db_conn:
            self.send("Database not available.")
            return
        from src.analysis.backtester import run_backtest, backtest_signal_type, rank_signals
        arg = args.strip().lower().replace(" ", "_")
        if arg:
            self.send(f"_Computing backtest for `{arg}`…_", parse_mode="Markdown")
            stats = backtest_signal_type(self.db_conn, arg)
            if not stats:
                self.send(f"No backtest data for `{arg}` (need ≥3 closed trades).")
                return
            wr = int(stats["win_rate"] * 100)
            lines = [
                f"*Backtest — {arg.replace('_',' ')}*",
                f"Trades: {stats['n_trades']}  |  Win rate: {wr}%",
                f"Avg PnL: {stats['avg_pnl_pct']:+.2f}%  |  Total: {stats['total_return_pct']:+.1f}%",
                f"Sharpe: {stats['sharpe'] or 'n/a'}  |  Max DD: {stats['max_drawdown_pct']:.1f}%",
            ]
            if stats.get("best_trade"):
                b = stats["best_trade"]
                lines.append(f"Best: {b['ticker']} {b['pnl_pct']:+.2f}% ({b['date']})")
            if stats.get("worst_trade"):
                w = stats["worst_trade"]
                lines.append(f"Worst: {w['ticker']} {w['pnl_pct']:+.2f}% ({w['date']})")
            self.send("\n".join(lines))
            return

        self.send("_Running full signal backtest…_", parse_mode="Markdown")
        results = run_backtest(self.db_conn)
        ranked = rank_signals(results)
        if not ranked:
            self.send("No backtest data yet (need closed trades with ≥3 per signal type).")
            return
        lines = ["*Signal Backtest — Top Signals by Sharpe*\n"]
        for s in ranked[:8]:
            wr = int((s["win_rate"] or 0) * 100)
            sr = f"{s['sharpe']:.2f}" if s["sharpe"] else "—"
            lines.append(
                f"• *{s['signal_name'].replace('_',' ')}*  "
                f"(n={s['n_trades']}, win={wr}%, Sharpe={sr}, "
                f"ret={s['total_return_pct']:+.1f}%)"
            )
        self.send("\n".join(lines))

    def _cmd_etf(self, args: str):
        """ETF top holdings, AUM, NAV premium/discount."""
        ticker = args.strip().upper()
        if not ticker:
            self.send("Usage: /etf <TICKER>\nExamples: /etf SPY  /etf QQQ  /etf EIDO")
            return
        if not self.db_conn:
            self.send("Database not available.")
            return
        import json as _json
        row = self.db_conn.execute(
            "SELECT * FROM etf_holdings_snapshot WHERE ticker=? ORDER BY snapshot_date DESC LIMIT 1",
            (ticker,)
        ).fetchone()
        if not row:
            self.send(f"No holdings data for *{ticker}*. Run /run to fetch the latest data.")
            return
        d = dict(row)
        holdings = _json.loads(d.get("holdings_json", "[]"))
        prem = d.get("premium_pct") or 0
        prem_label = "premium" if prem > 0.3 else ("discount" if prem < -0.3 else "at NAV")
        lines = [
            f"*{ticker} ETF Holdings*  ({d.get('snapshot_date','')})",
            f"AUM: ${d.get('aum_m',0):.0f}M  |  NAV: ${d.get('nav',0):.2f}  |  Price: ${d.get('price',0):.2f}",
            f"Premium/Discount: {prem:+.2f}% ({prem_label})",
            f"Holdings: {d.get('n_holdings',0)}",
            "",
            "*Top 5 Holdings:*",
        ]
        for h in holdings[:5]:
            lines.append(f"  {h.get('weight_pct',0):.1f}%  {h.get('symbol','')} — {h.get('name','')[:30]}")
        self.send("\n".join(lines))

    def _cmd_surprise(self):
        """Economic Surprise Index from FRED cache."""
        if not self.db_conn:
            self.send("Database not available.")
            return
        from src.data.economic_surprise import compute_surprise_index
        self.send("_Computing Economic Surprise Index…_", parse_mode="Markdown")
        esi = compute_surprise_index(self.db_conn)
        if not esi:
            self.send("ESI could not be computed (FRED data may not be cached yet — run /run first).")
            return
        score = esi.get("composite_score", 0)
        regime = esi.get("regime", "neutral")
        signal = esi.get("signal", "neutral").replace("_", " ")
        emoji = "🟢" if regime == "positive" else ("🔴" if regime == "negative" else "🟡")
        lines = [
            f"*Economic Surprise Index*  {emoji}",
            f"Composite score: *{score:+.2f}*  ({regime.upper()} — {signal})",
            f"_{esi.get('rationale', '')}_ ",
            "",
            "*By Indicator:*",
        ]
        for name, ind in (esi.get("by_indicator") or {}).items():
            z = ind.get("z_score")
            direction = ind.get("direction", "stable")
            z_str = f"{z:+.2f}" if z is not None else "—"
            arrow = "↑" if direction == "improving" else ("↓" if direction == "worsening" else "→")
            lines.append(f"  {arrow} {name}: {ind.get('latest','—')}  (z={z_str}, {direction})")
        self.send("\n".join(lines))

    def _cmd_earnings_sentiment(self, args: str):
        """Recent earnings tone from SEC 8-K filings."""
        ticker = args.strip().upper()
        snap_path = self.out_dir / "snapshot_latest.json"
        if not snap_path.exists():
            self.send("No snapshot yet — run /run first.")
            return
        import json as _json
        snap = _json.loads(snap_path.read_text(encoding="utf-8"))
        transcripts = snap.get("earnings_transcripts", [])
        if not transcripts:
            self.send("No earnings transcript data yet. Run /run to fetch the latest 8-K filings.")
            return

        if ticker:
            matches = [t for t in transcripts if t.get("ticker") == ticker]
            if not matches:
                self.send(f"No transcript data for *{ticker}* in the latest snapshot.")
                return
            t = matches[0]
            tone_emoji = "🟢" if t["tone"] == "bullish" else ("🔴" if t["tone"] == "bearish" else "🟡")
            lines = [
                f"*{ticker} Earnings Sentiment*  {tone_emoji}",
                f"Date: {t.get('date','')}  |  Tone: *{t.get('tone','').upper()}*",
                f"Guidance: {t.get('guidance', 'none')}",
                f"Themes: {', '.join(t.get('themes', [])[:3]) or '—'}",
            ]
            if t.get("excerpt"):
                lines += ["", f"_Excerpt:_ {t['excerpt'][:200]}…"]
            self.send("\n".join(lines))
            return

        lines = ["*Recent Earnings Sentiment (SEC 8-K)*\n"]
        for t in transcripts[:10]:
            tone_emoji = "🟢" if t["tone"] == "bullish" else ("🔴" if t["tone"] == "bearish" else "🟡")
            lines.append(
                f"{tone_emoji} *{t['ticker']}* ({t.get('date','')})  "
                f"{t.get('tone','').upper()}  |  guidance: {t.get('guidance','none')}"
            )
        self.send("\n".join(lines))

    def _handle_message(self, message: Dict[str, Any]):
        chat_id = str(message.get("chat", {}).get("id", ""))
        text = message.get("text", "").strip()

        # Security: only respond to the configured owner chat
        if chat_id != self.chat_id:
            log.warning("Ignoring message from unknown chat_id=%s", chat_id)
            return

        parts = text.split(None, 1) if text else []
        cmd = parts[0].lower().split("@")[0] if parts else ""
        args = parts[1] if len(parts) > 1 else ""

        if cmd in ("/start", "/help"):
            self._cmd_help()
        elif cmd == "/suggest":
            self._cmd_suggest(args)
        elif cmd == "/paper":
            self._cmd_paper(args)
        elif cmd == "/brief":
            self._cmd_brief()
        elif cmd == "/trades":
            self._cmd_trades()
        elif cmd == "/risk":
            self._cmd_risk()
        elif cmd == "/status":
            self._cmd_status()
        elif cmd == "/run":
            self._cmd_run()
        elif cmd == "/service":
            self._cmd_service(args)
        elif cmd == "/diagnose":
            self._cmd_diagnose()
        elif cmd == "/congress":
            self._cmd_congress(args)
        elif cmd == "/analyze":
            self._cmd_analyze(args)
        elif cmd == "/options":
            self._cmd_options(args)
        elif cmd == "/iv":
            self._cmd_iv(args)
        elif cmd == "/backtest":
            self._cmd_backtest(args)
        elif cmd == "/etf":
            self._cmd_etf(args)
        elif cmd == "/surprise":
            self._cmd_surprise()
        elif cmd == "/earnings":
            self._cmd_earnings_sentiment(args)
        elif cmd == "/memory":
            from src.analysis.intent_router import handle_memory_recall
            self.send(handle_memory_recall(self.db_conn))
        elif cmd == "/reminders":
            from src.db.memory import list_pending_reminders
            pending = list_pending_reminders(self.db_conn) if self.db_conn else []
            if not pending:
                self.send("No pending reminders.")
            else:
                lines = ["*Pending Reminders:*"]
                for r in pending:
                    lines.append(f"  • {r['due_at'][:16]} UTC — {r['message']}")
                self.send("\n".join(lines))
        elif text and not text.startswith("/"):
            self._handle_freetext(text)
        elif text:
            self.send("Unknown command. Type /help or just ask me anything about any market.")

    # ── Reminder checker ───────────────────────────────────────────────────────

    def _check_reminders(self):
        """Fire any reminders that are past due."""
        if not self.db_conn:
            return
        try:
            from src.db.memory import get_due_reminders, mark_reminder_fired
            due = get_due_reminders(self.db_conn)
            for r in due:
                self.send(f"Reminder: _{r['message']}_\n\nType /trades or ask me for an update.")
                mark_reminder_fired(self.db_conn, r["id"])
        except Exception as exc:
            log.error("Reminder check failed: %s", exc)

    # ── Polling loop ───────────────────────────────────────────────────────────

    def _poll_loop(self):
        log.info("Telegram polling started (chat_id=%s)", self.chat_id)
        _reminder_tick = 0
        while not self._stop.is_set():
            updates = self._get_updates()
            for upd in updates:
                self._offset = upd["update_id"] + 1
                self._save_offset(self._offset)
                msg = upd.get("message")
                if msg:
                    try:
                        self._handle_message(msg)
                    except Exception as exc:
                        log.error("Error handling Telegram message: %s", exc)
            # Check reminders every ~5 minutes (10 × 30s long-poll cycles)
            _reminder_tick += 1
            if _reminder_tick >= 10:
                _reminder_tick = 0
                self._check_reminders()
        log.info("Telegram polling stopped")

    def start_polling(self, run_callback: Optional[Callable] = None) -> threading.Thread:
        """Start background polling thread. Returns the thread."""
        self._run_callback = run_callback
        t = threading.Thread(target=self._poll_loop, daemon=True, name="telegram-poll")
        t.start()
        return t

    def stop(self):
        self._stop.set()

    # ── Outbound notifications ─────────────────────────────────────────────────

    def send_run_summary(self, brief_dict: Dict[str, Any], paper_stats: Dict[str, Any]):
        """Called by main.py after every pipeline run to push a summary."""
        date = brief_dict.get("as_of", "")[:10]
        summary = brief_dict.get("macro_summary_simple") or brief_dict.get("macro_summary", "")
        summary_short = summary[:400] + "..." if len(summary) > 400 else summary

        lines = [f"*Quant Bot Run — {date}*\n"]
        lines.append(f"*Macro:* {summary_short}\n")

        # Top 3 trade ideas
        ideas = brief_dict.get("short_term_ideas", [])[:3]
        if ideas:
            lines.append("*Top Ideas:*")
            for idea in ideas:
                lines.append(
                    f"  {idea.get('direction','')} {idea.get('ticker','')} "
                    f"[{idea.get('conviction','')}] — {idea.get('thesis','')[:80]}"
                )

        # Risk flags
        flags = brief_dict.get("risk_flags", [])
        if flags:
            lines.append("\n*Risk Flags:*")
            for f in flags[:3]:
                lines.append(f"  [{f.get('severity','').upper()}] {f.get('description','')[:80]}")

        # Stats
        wr = paper_stats.get("win_rate_pct", 0)
        total = paper_stats.get("total_trades", 0)
        new_sig = paper_stats.get("new_signals_today", 0)
        lines.append(f"\nWin rate: {wr:.1f}% ({total} trades) | New signals: {new_sig}")
        lines.append("\n/brief /trades /risk /status for details")

        self.send("\n".join(lines))
