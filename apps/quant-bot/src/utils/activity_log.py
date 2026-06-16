"""Lightweight structured activity logger for the dashboard live feed.

Writes events to outputs/activity_feed.json — the dashboard polls this file
every 3 seconds to show real-time bot decision-making.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal

_lock = threading.Lock()

Level = Literal["info", "success", "warning", "error", "decision"]

_feed_path: Path | None = None
_MAX_EVENTS = 200


def init(out_dir: Path) -> None:
    global _feed_path
    _feed_path = out_dir / "activity_feed.json"
    # Start fresh feed on each run
    _write([{
        "ts": _now(),
        "level": "info",
        "step": "startup",
        "msg": "Bot run starting...",
    }])


def log(msg: str, level: Level = "info", step: str = "") -> None:
    if _feed_path is None:
        return
    event = {"ts": _now(), "level": level, "step": step, "msg": msg}
    with _lock:
        events = _read()
        events.append(event)
        if len(events) > _MAX_EVENTS:
            events = events[-_MAX_EVENTS:]
        _write(events)


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


def _read() -> List[dict]:
    try:
        if _feed_path and _feed_path.exists():
            return json.loads(_feed_path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def _write(events: List[dict]) -> None:
    try:
        _feed_path.write_text(json.dumps(events, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass
