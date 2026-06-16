"""Groq integration — Llama 3.3 70B via Groq's OpenAI-compatible API."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict

from groq import Groq
from pydantic import ValidationError

from src.analysis.schemas import TradeBrief
from src.analysis.claude_analyst import (
    SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, _SCHEMA_HINT,
    _extract_json, _sanitise_brief, build_performance_section,
)
from src.analysis.payload_formatter import format_payload_as_text

log = logging.getLogger(__name__)


class GroqAnalyst:
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile",
                 max_tokens: int = 4096, temperature: float = 0.3):
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is required")
        self.client = Groq(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature

    def analyze(self, payload: Dict[str, Any], performance: Dict[str, Any] | None = None,
                paper_stats: Dict[str, Any] | None = None) -> TradeBrief:
        as_of = datetime.utcnow().strftime("%Y-%m-%d")
        payload_text = format_payload_as_text(payload)
        user_msg = USER_PROMPT_TEMPLATE.format(
            as_of=as_of,
            schema=_SCHEMA_HINT,
            performance_section=build_performance_section(performance or {}, paper_stats),
            payload=payload_text,
        )

        log.info("Calling Groq (%s): payload=%d chars, total_msg=%d chars (~%d tokens)",
                 self.model, len(payload_text), len(user_msg), len(user_msg) // 4)
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=self.max_tokens,
            temperature=self.temperature,
        )

        text = resp.choices[0].message.content or ""
        log.debug("Raw Groq response (%d chars)", len(text))

        json_str = _extract_json(text)
        try:
            import json as _json
            data = _sanitise_brief(_json.loads(json_str))
            return TradeBrief.model_validate(data)
        except ValidationError as exc:
            log.error("Groq returned invalid schema:\n%s\n---\nValidation error: %s", json_str[:2000], exc)
            raise
