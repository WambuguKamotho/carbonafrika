"""SQLite database layer — connection singleton + init."""
from __future__ import annotations

import sqlite3
import threading
from pathlib import Path

_local = threading.local()


def get_connection(db_path: Path) -> sqlite3.Connection:
    """Return a thread-local connection, creating it if needed."""
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(str(db_path), check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=DELETE")
        _local.conn.execute("PRAGMA foreign_keys=ON")
        _local.conn.execute("PRAGMA synchronous=NORMAL")
    return _local.conn


def init_db(db_path: Path) -> sqlite3.Connection:
    """Create all tables if they don't exist, return connection."""
    from src.db.schema import CREATE_STATEMENTS
    conn = get_connection(db_path)
    for stmt in CREATE_STATEMENTS:
        conn.execute(stmt)
    conn.commit()
    return conn
