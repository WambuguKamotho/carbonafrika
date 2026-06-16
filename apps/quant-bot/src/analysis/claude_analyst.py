"""Claude (Anthropic) integration: build prompt -> call API -> parse structured output."""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Any, Dict

from anthropic import Anthropic
from pydantic import ValidationError

from src.analysis.schemas import TradeBrief
from src.analysis.payload_formatter import format_payload_as_text

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an experienced senior macro/quant analyst preparing a daily
trading brief for an experienced investor. You combine macro indicators, sector technicals,
recent headlines, global event signals, options flow, insider activity, and COT positioning.

You are calm, evidence-based, and decisive. You always cite which inputs drove a call. You
NEVER invent prices, headlines, or data points that were not in the user's payload. You will
return ONLY a single valid JSON object matching the schema the user gives you — no prose
before or after, no markdown fences.

SELF-CORRECTION RULES — apply these every run:
- If your past win rate is below 50%, reduce conviction levels by one tier and widen stops.
- If high-conviction calls have underperformed low-conviction ones, recalibrate — be more selective.
- If long ideas have consistently outperformed shorts (or vice versa), weight accordingly.
- If a sector you called overweight dropped, explain why in this brief's risk_flags.
- If data is thin, say so in your rationale and prefer 'neutral' / 'low' conviction.
- Study your recent_calls track record before setting conviction. Let the data humble you."""

USER_PROMPT_TEMPLATE = """Today is {as_of}. Produce a trading brief based STRICTLY on the
JSON dataset below.

{performance_section}

Return a JSON object with EXACTLY this shape:

{schema}

Guidelines:
- 5-9 sector calls covering the main sectors in the data.
- 3-6 short_term_ideas (1d-4w horizon) and 3-6 long_term_ideas (6m+ horizon).
- Use tickers that appear in the dataset. If you reference a sector ETF, use the ETF symbol from `sector_etfs`.
- Quote entry/stop/target as ranges relative to the latest price (e.g., "entry 178-182, stop 172, target 195-200").
- `risk_flags` should call out anything in macro/events/news that would invalidate the brief.
- Keep `macro_summary` to 4-6 sentences.
- Apply the SELF-CORRECTION RULES above based on the performance data provided.
- Output ONLY the JSON object. No commentary outside it.

DATASET:
{payload}
"""


def build_performance_section(perf: dict, paper: dict | None = None) -> str:
    """Format past performance as a prompt section."""
    if not perf and not paper:
        return "PAST PERFORMANCE: No prior calls recorded — this is your first run."
    lines = [
        "PAST PERFORMANCE (use this to self-correct your approach):",
        f"  Total ideas scored: {perf.get('total_ideas_scored', 0)}",
        f"  Win rate: {perf.get('win_rate_pct', 0)}%",
        f"  Avg P&L: {perf.get('avg_pnl_pct', 0)}% | Avg win: {perf.get('avg_win_pct', 0)}% | Avg loss: {perf.get('avg_loss_pct', 0)}%",
        f"  Targets hit: {perf.get('targets_hit', 0)} | Stopped out: {perf.get('stopped_out', 0)}",
    ]
    by_conv = perf.get("by_conviction", {})
    if by_conv:
        lines.append("  By conviction: " + " | ".join(
            f"{k}: avg {v['avg_pnl']}% ({v['n']} ideas)" for k, v in by_conv.items()
        ))
    by_dir = perf.get("by_direction", {})
    if by_dir:
        lines.append("  By direction: " + " | ".join(
            f"{k}: avg {v['avg_pnl']}% ({v['n']} ideas)" for k, v in by_dir.items()
        ))
    recent = perf.get("recent_calls", [])
    if recent:
        lines.append("  Recent calls:")
        for run in recent:
            for idea in run.get("ideas", []):
                sign = "+" if (idea.get("pnl_pct") or 0) > 0 else ""
                lines.append(
                    f"    [{run['run']}] {idea['ticker']} {idea['direction'].upper()} "
                    f"({idea['conviction']}) → {sign}{idea.get('pnl_pct', '?')}% [{idea.get('status', '?')}]"
                )

    if paper and paper.get("total_trades", 0) > 0:
        lines.append(f"\nSYSTEMATIC SIGNAL BACKTEST (5-day hold, {paper['total_trades']} trades):")
        lines.append(f"  Win rate: {paper['win_rate_pct']}% | Avg P&L: {paper['avg_pnl_pct']:+.2f}%")
        for sn, st in (paper.get("by_signal") or {}).items():
            lines.append(f"  {sn}: {st['win_rate']}% win rate, avg {st['avg_pnl']:+.2f}%, n={st['n']}")
        lines.append("  (Use this to weight which signal types are currently working)")

    return "\n".join(lines)


_SCHEMA_HINT = """{
  "as_of": "YYYY-MM-DD",
  "macro_summary": "string — 4-6 sentences, analyst language",
  "macro_summary_simple": "string — same content in plain everyday English, no jargon, as if explaining to a friend with no finance background (4-6 sentences)",
  "sector_calls": [
    {"sector": "Technology", "stance": "overweight|neutral|underweight",
     "rationale": "string", "key_drivers": ["..."], "risks": ["..."]}
  ],
  "short_term_ideas": [
    {"ticker": "AAPL", "direction": "long|short", "horizon": "short_term",
     "conviction": "low|medium|high", "thesis": "string",
     "entry_zone": "string", "stop_loss": "string", "target": "string",
     "catalysts": ["..."]}
  ],
  "long_term_ideas": [
    {"ticker": "MSFT", "direction": "long|short", "horizon": "long_term",
     "conviction": "low|medium|high", "thesis": "string",
     "entry_zone": "string", "stop_loss": "string", "target": "string",
     "catalysts": ["..."]}
  ],
  "options_ideas": [
    {
      "ticker": "SPY",
      "strategy": "iron_condor|covered_call|long_call|long_put|bull_call_spread|bear_put_spread|cash_secured_put|long_straddle|short_straddle|other",
      "rationale": "string — why this strategy given current IV rank, trend, and flow",
      "legs": [
        {"action": "buy|sell", "option_type": "call|put", "strike": "string", "expiry": "string", "contracts": 1}
      ],
      "max_profit": "string",
      "max_loss": "string",
      "breakeven": "string",
      "iv_context": "string — e.g. IV rank 72, elevated, sell premium",
      "conviction": "low|medium|high"
    }
  ],
  "risk_flags": [
    {"flag": "string", "severity": "low|medium|high", "explanation": "string"}
  ],
  "closing_note": "string"
}"""


def _sanitise_brief(data: dict) -> dict:
    """Fix common LLM schema violations before Pydantic validation."""
    import json as _json

    for key in ("short_term_ideas", "long_term_ideas"):
        clean = []
        for idea in data.get(key, []):
            d = idea.get("direction", "long").lower().strip()
            if d not in ("long", "short"):
                d = "long"  # default neutral/unclear ideas to long
            idea["direction"] = d

            c = idea.get("conviction", "low").lower().strip()
            if c not in ("low", "medium", "high"):
                c = "low"
            idea["conviction"] = c

            h = idea.get("horizon", key.replace("_ideas", ""))
            if h not in ("short_term", "long_term"):
                h = "short_term" if key == "short_term_ideas" else "long_term"
            idea["horizon"] = h
            clean.append(idea)
        data[key] = clean

    for sc in data.get("sector_calls", []):
        s = sc.get("stance", "neutral").lower().strip()
        if s not in ("overweight", "neutral", "underweight"):
            s = "neutral"
        sc["stance"] = s

    for rf in data.get("risk_flags", []):
        sev = rf.get("severity", "low").lower().strip()
        if sev not in ("low", "medium", "high"):
            sev = "medium"
        rf["severity"] = sev

    _valid_strategies = {
        "covered_call", "cash_secured_put", "long_call", "long_put",
        "bull_call_spread", "bear_put_spread", "iron_condor", "iron_butterfly",
        "long_straddle", "short_straddle", "long_strangle", "short_strangle",
        "diagonal_spread", "calendar_spread", "other",
    }
    for oi in data.get("options_ideas", []):
        if oi.get("strategy", "").lower().replace(" ", "_") not in _valid_strategies:
            oi["strategy"] = "other"
        c = oi.get("conviction", "medium").lower().strip()
        if c not in ("low", "medium", "high"):
            oi["conviction"] = "medium"
        for leg in oi.get("legs", []):
            if leg.get("action", "").lower() not in ("buy", "sell"):
                leg["action"] = "buy"
            if leg.get("option_type", "").lower() not in ("call", "put"):
                leg["option_type"] = "call"

    return data


def _extract_json(text: str) -> str:
    """Pull the first {...} JSON object from a string (in case the model added stray text)."""
    text = text.strip()
    # strip ```json fences if any
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    if text.startswith("{") and text.endswith("}"):
        return text
    # find first balanced object
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in model output")
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    raise ValueError("Unbalanced JSON in model output")


class ClaudeAnalyst:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6",
                 max_tokens: int = 4096, temperature: float = 0.3):
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is required to call Claude")
        self.client = Anthropic(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature

    def analyze(self, payload: Dict[str, Any], performance: Dict[str, Any] | None = None,
                paper_stats: Dict[str, Any] | None = None) -> TradeBrief:
        as_of = datetime.utcnow().strftime("%Y-%m-%d")
        user_msg = USER_PROMPT_TEMPLATE.format(
            as_of=as_of,
            schema=_SCHEMA_HINT,
            performance_section=build_performance_section(performance or {}, paper_stats),
            payload=format_payload_as_text(payload),
        )

        log.info("Calling Claude (%s) with payload of ~%d chars", self.model, len(user_msg))
        resp = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )

        text = "".join(
            block.text for block in resp.content if getattr(block, "type", "") == "text"
        )
        log.debug("Raw Claude response (%d chars)", len(text))

        json_str = _extract_json(text)
        try:
            data = _sanitise_brief(json.loads(json_str))
            return TradeBrief.model_validate(data)
        except ValidationError as exc:
            log.error("Claude returned invalid schema:\n%s\n---\nValidation error: %s", json_str[:2000], exc)
            raise
