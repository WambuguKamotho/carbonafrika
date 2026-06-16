"""LLM-powered conversational trading advisor for Telegram.

Handles free-text questions across all asset classes:
Forex, Stocks, Options, ETFs, Crypto, Commodities, Futures, Bonds.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import requests

log = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are an expert multi-asset trading advisor with deep knowledge across:
- Forex (majors, minors, exotics, African currencies)
- Equities (US, European, Asian, African markets)
- Options (calls, puts, spreads, Greeks, IV, strategies)
- ETFs (sector, thematic, leveraged, inverse)
- Cryptocurrencies (spot, futures, DeFi)
- Commodities (energy, metals, agriculture)
- Fixed Income (bonds, yield curves, duration)
- Futures (indices, commodities, FX)

Your role:
- Give specific, actionable trading insights based on current market data
- Explain clearly whether for beginners or experienced traders
- Always mention key risks alongside any opportunity
- Use the [Current Market Context] section for real prices, sector stances, and risk flags — NEVER invent price levels
- If a price is not in the context, say "check current price" rather than guessing
- Reference the [Recent Conversation History] to maintain continuity — if the user refers to something said earlier, use it

CRITICAL: If the user mentions reminder timing ("in X days", "after X weeks"), acknowledge the topic AND remind them a reminder has been set.
Always end responses with a brief risk reminder appropriate to the instrument.
Keep responses concise — 150-250 words unless asked for more detail.
"""


def _load_brief_context(out_dir: Path) -> str:
    """Load latest brief + snapshot prices as LLM context."""
    brief_path = out_dir / "brief_latest.json"
    payload_path = out_dir / "payload_latest.json"
    if not brief_path.exists():
        return ""
    try:
        brief = json.loads(brief_path.read_text(encoding="utf-8"))
        lines = []

        date = brief.get("as_of", "")[:10]
        if date:
            lines.append(f"DATA AS OF: {date}")

        macro = brief.get("macro_summary_simple") or brief.get("macro_summary", "")
        if macro:
            lines.append(f"MACRO: {macro[:350]}")

        flags = brief.get("risk_flags", [])
        if flags:
            lines.append("RISK FLAGS: " + "; ".join(
                f.get("description", "")[:60] for f in flags[:3]
            ))

        calls = brief.get("sector_calls", [])
        if calls:
            lines.append("SECTOR STANCE: " + ", ".join(
                f"{c.get('sector')} {c.get('stance')}" for c in calls[:6]
            ))

        # Inject actual FX & commodity prices from payload
        if payload_path.exists():
            try:
                payload = json.loads(payload_path.read_text(encoding="utf-8"))
                fx = payload.get("fx_and_commodities", [])
                if fx:
                    fx_lines = []
                    for r in fx[:12]:
                        tk = r.get("ticker") or r.get("index", "")
                        close = r.get("close")
                        ret1d = r.get("ret_1d")
                        if tk and close:
                            chg = f" ({ret1d*100:+.2f}%)" if ret1d is not None else ""
                            fx_lines.append(f"{tk}={close:.4f}{chg}")
                    if fx_lines:
                        lines.append("FX/COMMODITIES: " + " | ".join(fx_lines))

                # Top movers from sector snapshots
                movers = []
                for r in payload.get("sector_rotation", [])[:10]:
                    tk = r.get("ticker", "")
                    close = r.get("close")
                    ret1d = r.get("ret_1d")
                    if tk and close:
                        chg = f"({ret1d*100:+.2f}%)" if ret1d is not None else ""
                        movers.append(f"{tk}=${close:.2f}{chg}")
                if movers:
                    lines.append("SECTOR ETFs: " + " | ".join(movers))

                # Congressional trades
                congress = payload.get("congressional_trades_by_ticker", [])
                if congress:
                    clines = []
                    for r in congress[:8]:
                        tk = r.get("ticker", "")
                        buys = r.get("buys", 0)
                        sells = r.get("sells", 0)
                        pols = ", ".join((r.get("politicians") or [])[:2])
                        clines.append(f"{tk}(B:{buys}/S:{sells} {pols})")
                    lines.append("CONGRESS TRADES 30d: " + " | ".join(clines))

            except Exception:
                pass

        # Trade ideas so LLM can reference them
        ideas = (brief.get("short_term_ideas") or [])[:4]
        if ideas:
            idea_strs = []
            for i in ideas:
                ez = i.get("entry_zone", "")
                sl = i.get("stop_loss", "")
                tgt = i.get("target", "")
                idea_strs.append(
                    f"{i.get('direction','').upper()} {i.get('ticker','')} "
                    f"[{i.get('conviction','')}] entry:{ez} sl:{sl} tgt:{tgt}"
                )
            lines.append("CURRENT IDEAS: " + " | ".join(idea_strs))

        return "\n".join(lines)
    except Exception:
        return ""


def _call_llm(system: str, user: str, cfg) -> str:
    """Call available LLM providers in order: Groq → Together → Gemini."""
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    errors = []

    # 1. Groq
    if cfg.groq_api_key:
        try:
            from groq import Groq
            resp = Groq(api_key=cfg.groq_api_key).chat.completions.create(
                model=cfg.groq_model, messages=messages, max_tokens=512, temperature=0.4,
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            errors.append(f"Groq: {e}")

    # 2. Together
    if cfg.together_api_key:
        try:
            resp = requests.post(
                "https://api.together.xyz/v1/chat/completions",
                headers={"Authorization": f"Bearer {cfg.together_api_key}"},
                json={"model": cfg.together_model, "messages": messages,
                      "max_tokens": 512, "temperature": 0.4},
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"] or ""
        except Exception as e:
            errors.append(f"Together: {e}")

    # 3. Gemini — try configured model, then 2.5-flash as fallback
    if cfg.gemini_api_key:
        from google import genai as _genai
        _gclient = _genai.Client(api_key=cfg.gemini_api_key)
        full_prompt = f"{system}\n\n{user}"
        for _gmodel in [cfg.gemini_model, "gemini-2.5-flash", "gemini-2.5-flash-lite"]:
            try:
                result = _gclient.models.generate_content(model=_gmodel, contents=full_prompt)
                return result.text or ""
            except Exception as e:
                errors.append(f"Gemini/{_gmodel}: {str(e)[:60]}")

    log.error("All LLM providers failed: %s", " | ".join(errors))
    return "All AI providers are currently unavailable. Try again in a few minutes."


class TradingAdvisor:
    def __init__(self, cfg, out_dir: Path, db_conn=None):
        self.cfg = cfg
        self.out_dir = out_dir
        self.db_conn = db_conn  # optional — for memory injection

    def ask(self, question: str, quote_context: str = "") -> str:
        """Answer a free-text trading question with market + memory + history context."""
        market_ctx = _load_brief_context(self.out_dir)

        user_parts = []

        # Inject user memories to personalise advice
        if self.db_conn:
            try:
                from src.db.memory import format_memories_for_prompt, format_conversation_history
                mem_ctx = format_memories_for_prompt(self.db_conn)
                if mem_ctx:
                    user_parts.append(mem_ctx)
                conv_ctx = format_conversation_history(self.db_conn, limit=6)
                if conv_ctx:
                    user_parts.append(conv_ctx)
            except Exception:
                pass

        if market_ctx:
            user_parts.append(f"[Current Market Context]\n{market_ctx}")
        if quote_context:
            user_parts.append(f"[Live Quote]\n{quote_context}")
        user_parts.append(f"[Question]\n{question}")

        user_msg = "\n\n".join(user_parts)

        try:
            return _call_llm(_SYSTEM_PROMPT, user_msg, self.cfg)
        except Exception as exc:
            log.error("TradingAdvisor LLM error: %s", exc)
            return "Sorry, I couldn't process that right now. Try again in a moment."
