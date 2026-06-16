"""Google Gemini integration: same interface as ClaudeAnalyst."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict

from google import genai
from google.genai import types
from pydantic import ValidationError

from src.analysis.schemas import TradeBrief
from src.analysis.claude_analyst import (
    SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, _SCHEMA_HINT,
    _extract_json, _sanitise_brief, build_performance_section
)
from src.analysis.payload_formatter import format_payload_as_text

log = logging.getLogger(__name__)


class GeminiAnalyst:
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash",
                 max_tokens: int = 4096, temperature: float = 0.3):
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is required")
        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            max_output_tokens=max_tokens,
            temperature=temperature,
        )

    def analyze(self, payload: Dict[str, Any], performance: Dict[str, Any] | None = None,
                paper_stats: Dict[str, Any] | None = None) -> TradeBrief:
        as_of = datetime.utcnow().strftime("%Y-%m-%d")
        user_msg = USER_PROMPT_TEMPLATE.format(
            as_of=as_of,
            schema=_SCHEMA_HINT,
            performance_section=build_performance_section(performance or {}, paper_stats),
            payload=format_payload_as_text(payload),
        )

        log.info("Calling Gemini (%s) with payload of ~%d chars", self.model, len(user_msg))
        resp = self.client.models.generate_content(
            model=self.model,
            contents=user_msg,
            config=self.config,
        )
        text = resp.text
        log.debug("Raw Gemini response (%d chars)", len(text))

        json_str = _extract_json(text)
        try:
            import json as _json
            data = _sanitise_brief(_json.loads(json_str))
            return TradeBrief.model_validate(data)
        except ValidationError as exc:
            log.error("Gemini returned invalid schema:\n%s\n---\nValidation error: %s", json_str[:2000], exc)
            raise
