"""Pydantic schemas for Claude's structured trade brief."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


Stance = Literal["overweight", "neutral", "underweight"]
Direction = Literal["long", "short"]
Conviction = Literal["low", "medium", "high"]


class SectorCall(BaseModel):
    sector: str
    stance: Stance
    rationale: str = Field(..., description="2-4 sentences citing macro / news / technicals")
    key_drivers: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)


class TradeIdea(BaseModel):
    ticker: str
    direction: Direction
    horizon: Literal["short_term", "long_term"]
    conviction: Conviction
    thesis: str
    entry_zone: Optional[str] = None
    stop_loss: Optional[str] = None
    target: Optional[str] = None
    catalysts: List[str] = Field(default_factory=list)


class RiskFlag(BaseModel):
    flag: str
    severity: Literal["low", "medium", "high"]
    explanation: str


OptionsStrategy = Literal[
    "covered_call", "cash_secured_put", "long_call", "long_put",
    "bull_call_spread", "bear_put_spread", "iron_condor", "iron_butterfly",
    "long_straddle", "short_straddle", "long_strangle", "short_strangle",
    "diagonal_spread", "calendar_spread", "other",
]


class OptionsLeg(BaseModel):
    action: Literal["buy", "sell"]
    option_type: Literal["call", "put"]
    strike: Optional[str] = None
    expiry: Optional[str] = None
    contracts: int = 1


class OptionsIdea(BaseModel):
    ticker: str
    strategy: OptionsStrategy
    rationale: str
    legs: List[OptionsLeg] = Field(default_factory=list)
    max_profit: Optional[str] = None
    max_loss: Optional[str] = None
    breakeven: Optional[str] = None
    iv_context: Optional[str] = None   # e.g. "IV rank 72 — elevated, sell premium"
    conviction: Conviction = "medium"


class TradeBrief(BaseModel):
    """The full structured response from Claude."""
    as_of: str
    macro_summary: str
    macro_summary_simple: str = ""
    sector_calls: List[SectorCall]
    short_term_ideas: List[TradeIdea]
    long_term_ideas: List[TradeIdea]
    options_ideas: List[OptionsIdea] = Field(default_factory=list)
    risk_flags: List[RiskFlag]
    closing_note: str = ""
