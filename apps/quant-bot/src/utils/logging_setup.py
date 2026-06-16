"""Centralized logging setup."""
import logging
import sys
from pathlib import Path
from datetime import datetime


def setup_logging(level: str = "INFO", log_dir: Path | None = None) -> logging.Logger:
    fmt = "%(asctime)s | %(levelname)-7s | %(name)-22s | %(message)s"
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]

    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.log"
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))

    logging.basicConfig(level=level.upper(), format=fmt, handlers=handlers, force=True)
    # Quiet noisy libs
    for noisy in ("urllib3", "yfinance", "peewee"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    return logging.getLogger("quant_bot")
