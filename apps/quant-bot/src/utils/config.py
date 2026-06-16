"""Load YAML config + .env into a single object."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict

import yaml
from dotenv import load_dotenv


@dataclass
class Config:
    raw: Dict[str, Any] = field(default_factory=dict)

    # secrets
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""
    fred_api_key: str = ""
    newsapi_key: str = ""
    eia_api_key: str = ""
    telegram_token: str = ""
    telegram_chat_id: str = ""
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    firms_api_key: str = ""
    vessel_api_key: str = ""
    together_api_key: str = ""
    together_model: str = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
    llm_provider: str = "groq"
    claude_model: str = "claude-sonnet-4-6"
    gemini_model: str = "gemini-2.5-flash"
    groq_model: str = "llama-3.3-70b-versatile"
    log_level: str = "INFO"

    # convenience accessors
    def get(self, key: str, default=None):
        return self.raw.get(key, default)

    @property
    def sectors(self) -> Dict[str, list]:
        return self.raw.get("sectors", {})

    @property
    def sector_etfs(self) -> Dict[str, str]:
        return self.raw.get("sector_etfs", {})

    @property
    def bond_etfs(self) -> Dict[str, str]:
        return self.raw.get("bond_etfs", {})

    @property
    def international_etfs(self) -> Dict[str, str]:
        return self.raw.get("international_etfs", {})

    @property
    def fx_commodities(self) -> Dict[str, str]:
        return self.raw.get("fx_commodities", {})

    @property
    def fred_series(self) -> Dict[str, str]:
        return self.raw.get("fred_series", {})

    @property
    def lookback_days(self) -> int:
        return int(self.raw.get("lookback_days", 400))


def load_config(project_root: Path | None = None) -> Config:
    """Load config.yaml + .env from the project root."""
    if project_root is None:
        project_root = Path(__file__).resolve().parents[2]

    load_dotenv(project_root / ".env")
    yaml_path = project_root / "config.yaml"
    raw: Dict[str, Any] = {}
    if yaml_path.exists():
        with open(yaml_path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}

    return Config(
        raw=raw,
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        fred_api_key=os.getenv("FRED_API_KEY", ""),
        newsapi_key=os.getenv("NEWSAPI_KEY", ""),
        eia_api_key=os.getenv("EIA_API_KEY", ""),
        firms_api_key=os.getenv("FIRMS_API_KEY", ""),
        vessel_api_key=os.getenv("VESSEL_API_KEY", ""),
        telegram_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
        telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID", ""),
        ollama_host=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
        ollama_model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
        together_api_key=os.getenv("TOGETHER_API_KEY", ""),
        together_model=os.getenv("TOGETHER_MODEL", "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"),
        llm_provider=os.getenv("LLM_PROVIDER", "groq"),
        claude_model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
    )
