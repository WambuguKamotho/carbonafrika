"""User memory store — persistent key-value memory for the Telegram bot.

Stores user preferences, trading style, notes, and learned patterns.
All memories are injected into the LLM context to personalise advice.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Write ──────────────────────────────────────────────────────────────────────

def save_memory(conn: sqlite3.Connection, key: str, value: str,
                category: str = "general") -> None:
    """Insert or replace a memory entry."""
    now = _now()
    conn.execute("""
        INSERT INTO user_memory (category, key, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    """, (category, key, value, now, now))
    conn.commit()


def delete_memory(conn: sqlite3.Connection, key: str) -> bool:
    """Delete a memory by key. Returns True if something was deleted."""
    cur = conn.execute("DELETE FROM user_memory WHERE key = ?", (key,))
    conn.commit()
    return cur.rowcount > 0


def clear_category(conn: sqlite3.Connection, category: str) -> int:
    """Delete all memories in a category. Returns count deleted."""
    cur = conn.execute("DELETE FROM user_memory WHERE category = ?", (category,))
    conn.commit()
    return cur.rowcount


# ── Read ───────────────────────────────────────────────────────────────────────

def get_memory(conn: sqlite3.Connection, key: str) -> Optional[str]:
    row = conn.execute(
        "SELECT value FROM user_memory WHERE key = ?", (key,)
    ).fetchone()
    return row["value"] if row else None


def get_all_memories(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    rows = conn.execute(
        "SELECT category, key, value, updated_at FROM user_memory ORDER BY category, key"
    ).fetchall()
    return [dict(r) for r in rows]


def get_category(conn: sqlite3.Connection, category: str) -> List[Dict[str, Any]]:
    rows = conn.execute(
        "SELECT key, value FROM user_memory WHERE category = ? ORDER BY key",
        (category,)
    ).fetchall()
    return [dict(r) for r in rows]


def format_memories_for_prompt(conn: sqlite3.Connection) -> str:
    """Return all memories as a compact string for LLM context injection."""
    memories = get_all_memories(conn)
    if not memories:
        return ""
    lines = ["[USER PROFILE & PREFERENCES]"]
    by_cat: Dict[str, list] = {}
    for m in memories:
        by_cat.setdefault(m["category"], []).append(f"{m['key']}: {m['value']}")
    for cat, items in by_cat.items():
        lines.append(f"{cat.upper()}: " + " | ".join(items))
    return "\n".join(lines)


# ── Conversation log ───────────────────────────────────────────────────────────

def log_conversation(conn: sqlite3.Connection, user_msg: str,
                     bot_response: str, intent: str = "") -> None:
    conn.execute("""
        INSERT INTO conversation_log (timestamp, user_message, bot_response, intent)
        VALUES (?, ?, ?, ?)
    """, (_now(), user_msg, bot_response, intent))
    conn.commit()


def get_recent_conversations(conn: sqlite3.Connection, limit: int = 10) -> List[Dict]:
    rows = conn.execute("""
        SELECT timestamp, user_message, bot_response, intent
        FROM conversation_log ORDER BY id DESC LIMIT ?
    """, (limit,)).fetchall()
    return [dict(r) for r in reversed(rows)]


def format_conversation_history(conn: sqlite3.Connection, limit: int = 6) -> str:
    """Return recent conversation turns as a compact string for LLM context."""
    turns = get_recent_conversations(conn, limit=limit)
    if not turns:
        return ""
    lines = ["[RECENT CONVERSATION HISTORY]"]
    for t in turns:
        ts = t["timestamp"][:16]
        lines.append(f"[{ts}] User: {t['user_message'][:200]}")
        resp = (t["bot_response"] or "")[:300]
        lines.append(f"[{ts}] Bot: {resp}")
    return "\n".join(lines)


# ── Reminders ─────────────────────────────────────────────────────────────────

def save_reminder(conn: sqlite3.Connection, message: str, due_at: str) -> int:
    """Store a reminder. due_at is an ISO-8601 UTC string. Returns the new row id."""
    now = _now()
    cur = conn.execute("""
        INSERT INTO reminders (message, due_at, created_at, fired)
        VALUES (?, ?, ?, 0)
    """, (message, due_at, now))
    conn.commit()
    return cur.lastrowid


def get_due_reminders(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """Return all unfired reminders whose due_at <= now."""
    now = _now()
    rows = conn.execute("""
        SELECT id, message, due_at FROM reminders
        WHERE fired = 0 AND due_at <= ?
        ORDER BY due_at ASC
    """, (now,)).fetchall()
    return [dict(r) for r in rows]


def mark_reminder_fired(conn: sqlite3.Connection, reminder_id: int) -> None:
    conn.execute("UPDATE reminders SET fired = 1 WHERE id = ?", (reminder_id,))
    conn.commit()


def list_pending_reminders(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    rows = conn.execute("""
        SELECT id, message, due_at FROM reminders
        WHERE fired = 0 ORDER BY due_at ASC
    """).fetchall()
    return [dict(r) for r in rows]
