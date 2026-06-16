"""Ollama integration — runs any local model (llama3.1:8b, etc.) via REST API.

Ollama exposes an OpenAI-compatible endpoint at /v1/chat/completions.
We use requests directly so there's no extra dependency.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict

import requests
from pydantic import ValidationError

from src.analysis.schemas import TradeBrief
from src.analysis.claude_analyst import (
    SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, _SCHEMA_HINT,
    _extract_json, _sanitise_brief, build_performance_section,
)
from src.analysis.payload_formatter import format_payload_as_text

log = logging.getLogger(__name__)


class OllamaAnalyst:
    def __init__(self, host: str = "http://localhost:11434",
                 model: str = "llama3.1:8b",
                 max_tokens: int = 2048,
                 temperature: float = 0.3,
                 timeout: int = 900):
        self.host = host.rstrip("/")
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.timeout = timeout

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

        log.info("Calling Ollama (%s @ %s): payload=%d chars (~%d tokens)",
                 self.model, self.host, len(payload_text), len(user_msg) // 4)

        # Use Ollama's native /api/chat — more stable than the /v1/ OpenAI wrapper
        # for long CPU inference runs over a remote connection.
        session = requests.Session()
        session.headers.update({"Connection": "keep-alive"})

        resp = session.post(
            f"{self.host}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "stream": True,
                "options": {
                    "num_ctx": 4096,
                    "temperature": self.temperature,
                    "num_predict": self.max_tokens,
                },
            },
            timeout=self.timeout,
            stream=True,
        )
        resp.raise_for_status()

        # Each line is a JSON object: {"message": {"content": "token"}, "done": false}
        chunks: list[str] = []
        for raw_line in resp.iter_lines():
            if not raw_line:
                continue
            try:
                obj = json.loads(raw_line)
                token = obj.get("message", {}).get("content", "")
                if token:
                    chunks.append(token)
                if obj.get("done"):
                    break
            except Exception:
                continue

        text = "".join(chunks)
        log.debug("Raw Ollama response (%d chars)", len(text))

        json_str = _extract_json(text)
        try:
            data = _sanitise_brief(json.loads(json_str))
            return TradeBrief.model_validate(data)
        except ValidationError as exc:
            log.error("Ollama returned invalid schema:\n%s\n---\nValidation error: %s",
                      json_str[:2000], exc)
            raise
