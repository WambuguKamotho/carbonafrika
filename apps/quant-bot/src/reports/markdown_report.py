"""Render the structured TradeBrief into a Markdown daily brief."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from src.analysis.schemas import TradeBrief


def _idea_block(idea) -> str:
    bits = [
        f"**{idea.ticker}** — {idea.direction.upper()}  ({idea.conviction.upper()} conviction)",
        f"  - Thesis: {idea.thesis}",
    ]
    if idea.entry_zone:
        bits.append(f"  - Entry: {idea.entry_zone}")
    if idea.stop_loss:
        bits.append(f"  - Stop: {idea.stop_loss}")
    if idea.target:
        bits.append(f"  - Target: {idea.target}")
    if idea.catalysts:
        bits.append("  - Catalysts: " + "; ".join(idea.catalysts))
    return "\n".join(bits)


def render_markdown(brief: TradeBrief, snapshot: Dict[str, Any]) -> str:
    out: list[str] = []
    out.append(f"# AI Quant Bot — Trading Brief")
    out.append(f"_Generated: {brief.as_of} (UTC)_\n")
    out.append("> Suggestions only. Not financial advice.\n")

    out.append("## Macro Snapshot\n")
    out.append(brief.macro_summary + "\n")

    macro = snapshot.get("macro", [])
    if macro:
        out.append("| Indicator | Latest | YoY % | As of |")
        out.append("|---|---:|---:|---|")
        for m in macro:
            out.append(f"| {m.get('name')} | {m.get('latest')} | {m.get('yoy_pct')} | {m.get('as_of')} |")
        out.append("")

    yc = snapshot.get("yield_curve") or {}
    if yc:
        status = "INVERTED" if yc.get("inverted") else "Normal"
        out.append(f"**Yield curve (10y-2y):** {yc.get('spread_bps')} bps — {status}\n")

    out.append("## Sector Calls\n")
    for sc in brief.sector_calls:
        out.append(f"### {sc.sector} — _{sc.stance.upper()}_")
        out.append(sc.rationale)
        if sc.key_drivers:
            out.append("\n**Drivers:** " + "; ".join(sc.key_drivers))
        if sc.risks:
            out.append("**Risks:** " + "; ".join(sc.risks))
        out.append("")

    out.append("## Short-Term Trade Ideas (1d–4w)\n")
    for idea in brief.short_term_ideas:
        out.append(_idea_block(idea))
        out.append("")

    out.append("## Long-Term Trade Ideas (6m+)\n")
    for idea in brief.long_term_ideas:
        out.append(_idea_block(idea))
        out.append("")

    out.append("## Risk Flags\n")
    for r in brief.risk_flags:
        out.append(f"- **[{r.severity.upper()}] {r.flag}** — {r.explanation}")
    out.append("")

    if brief.closing_note:
        out.append("## Closing Note\n")
        out.append(brief.closing_note + "\n")

    rotation = snapshot.get("sector_rotation") or []
    if rotation:
        out.append("## Sector Rotation Snapshot (ETF momentum)\n")
        out.append("| Rank | Sector ETF | 1m % | 3m % | 1y % |")
        out.append("|---:|---|---:|---:|---:|")
        for r in rotation:
            out.append(
                f"| {r.get('rank')} | {r.get('ticker')} | {r.get('ret_1m')} | {r.get('ret_3m')} | {r.get('ret_1y')} |"
            )
        out.append("")

    return "\n".join(out)


def write_markdown(text: str, out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding="utf-8")
    return out_path
