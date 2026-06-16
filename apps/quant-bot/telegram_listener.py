"""Standalone Telegram listener — keeps the bot responsive 24/7.

Listens for Telegram commands and serves the FastAPI dashboard on :8081.
Run via Docker: docker compose up -d
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set

from src.utils.config import load_config
from src.utils.logging_setup import setup_logging
from src.reports.telegram_bot import TelegramBot
from src.analysis.trading_advisor import TradingAdvisor
from src.db import init_db

project_root = Path(__file__).resolve().parent
cfg = load_config(project_root)
log = setup_logging(cfg.log_level, log_dir=project_root / "logs")


_RUN_TIMEOUT_SECS = 720  # 12 minutes — kill and alert if run hangs past this
_run_lock = threading.Lock()  # prevent concurrent pipeline runs

_PYTHON = sys.executable


def _send_tg(msg: str):
    """Fire-and-forget Telegram message (used from watchdog thread)."""
    try:
        from src.reports.telegram_bot import TelegramBot as _TG
        _TG(cfg.telegram_token, cfg.telegram_chat_id,
            project_root / "outputs").send(msg)
    except Exception:
        pass


def trigger_run():
    """Spawn main.py as a subprocess with a watchdog that kills it if it hangs."""
    if not _run_lock.acquire(blocking=False):
        _send_tg("A run is already in progress — please wait for it to finish.")
        log.warning("Ignoring /run — pipeline already running")
        return

    log.info("Telegram /run triggered — launching %s main.py", _PYTHON)

    log.info("Using Python: %s", _PYTHON)
    proc = subprocess.Popen(
        [_PYTHON, str(project_root / "main.py")],
        cwd=str(project_root),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,  # merge stderr into stdout
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )

    def _stream_logs(p: subprocess.Popen):
        """Forward subprocess output to our log so errors are visible."""
        for line in p.stdout:
            line = line.rstrip()
            if line:
                log.info("[main] %s", line)

    threading.Thread(target=_stream_logs, args=(proc,), daemon=True, name="run-log-reader").start()

    def _watchdog(p: subprocess.Popen):
        deadline = time.time() + _RUN_TIMEOUT_SECS
        try:
            while time.time() < deadline:
                if p.poll() is not None:
                    rc = p.returncode
                    log.info("main.py finished (returncode=%d)", rc)
                    if rc != 0:
                        log.error("main.py exited with error code %d", rc)
                        _send_tg(
                            f"Run finished with error (exit code {rc}).\n"
                            "Check the logs for details. Type /run to retry."
                        )
                    return
                time.sleep(5)
            # Still running after timeout — kill it and alert
            log.error("main.py hung after %ds — killing process", _RUN_TIMEOUT_SECS)
            p.kill()
            _send_tg(
                f"Run timed out after {_RUN_TIMEOUT_SECS // 60} minutes and was killed.\n"
                "One or more data sources likely hung. Check logs.\n"
                "Type /run to try again, or /brief to see the last result."
            )
        finally:
            _run_lock.release()

    threading.Thread(target=_watchdog, args=(proc,), daemon=True, name="run-watchdog").start()


# ── Scheduled auto-runs ───────────────────────────────────────────────────────
# Times in EAT (UTC+3) when the full pipeline fires automatically.
# Format: (hour, minute) in 24h EAT time.
_SCHEDULED_RUNS_EAT = [
    (9,  0),   # European market open
    (16, 30),  # US market open
    (23, 0),   # US close / Asia pre-market
]
_EAT_OFFSET_HOURS = 3  # EAT = UTC+3


def _scheduler_loop():
    """Background thread: fires trigger_run() at scheduled EAT times once per day."""
    fired_today: set = set()
    log.info("Scheduler started — auto-runs at %s EAT",
             ", ".join(f"{h:02d}:{m:02d}" for h, m in _SCHEDULED_RUNS_EAT))
    while True:
        now_utc = datetime.now(timezone.utc)
        eat_hour = (now_utc.hour + _EAT_OFFSET_HOURS) % 24
        eat_minute = now_utc.minute
        eat_date = (now_utc.hour + _EAT_OFFSET_HOURS) // 24  # day rollover key
        day_key = f"{now_utc.date()}-{eat_date}"

        # Reset fired set on new day
        if not any(k.startswith(str(now_utc.date())) for k in fired_today):
            fired_today.clear()

        for sched_h, sched_m in _SCHEDULED_RUNS_EAT:
            slot_key = f"{day_key}-{sched_h:02d}{sched_m:02d}"
            if slot_key in fired_today:
                continue
            # Fire within a 2-minute window of the scheduled time
            if eat_hour == sched_h and abs(eat_minute - sched_m) <= 1:
                fired_today.add(slot_key)
                log.info("Scheduled auto-run firing at %02d:%02d EAT", sched_h, sched_m)
                _send_tg(
                    f"Scheduled auto-run starting ({sched_h:02d}:{sched_m:02d} EAT)\n"
                    "_This happens automatically — no action needed._"
                )
                threading.Thread(target=trigger_run, daemon=True,
                                 name=f"sched-run-{sched_h}{sched_m:02d}").start()

        time.sleep(60)  # check every minute


# ── Lightweight price monitor ─────────────────────────────────────────────────
_MONITOR_INTERVAL_SECS = 900   # check every 15 minutes
_ALERT_THRESHOLD_1D    = 2.5   # % intraday move to alert on
_ALERT_THRESHOLD_15MIN = 1.5   # % move since last check to alert on


def _price_monitor_loop():
    """
    Background thread: fetches watchlist prices every 15 min.
    Sends Telegram alert if any ticker moves significantly — no LLM, zero tokens.
    """
    import yfinance as yf

    # Build watchlist from config
    watch: list[str] = []
    for tickers in cfg.sectors.values():
        watch.extend(tickers)
    # Add key ETFs and FX
    watch.extend(list(cfg.sector_etfs.values())[:6])
    watch.extend(["GC=F", "CL=F", "EURUSD=X", "ZAR=X"])
    watch = list(dict.fromkeys(watch))[:40]  # dedupe, cap at 40

    prev_prices: Dict[str, float] = {}
    alerted_tickers: Dict[str, float] = {}  # ticker → chg_1d when last alerted
    log.info("Price monitor started — watching %d symbols every %ds", len(watch), _MONITOR_INTERVAL_SECS)

    while True:
        time.sleep(_MONITOR_INTERVAL_SECS)
        try:
            data = yf.download(
                tickers=watch, period="2d", interval="1d",
                auto_adjust=True, progress=False, threads=True,
            )
            if data is None or data.empty:
                continue

            alerts = []
            new_prices: Dict[str, float] = {}
            still_hot: set = set()

            for tk in watch:
                try:
                    if isinstance(data.columns, __import__("pandas").MultiIndex):
                        series = data["Close"][tk].dropna()
                    else:
                        series = data["Close"].dropna()
                    if len(series) < 2:
                        continue
                    price_now  = float(series.iloc[-1])
                    price_prev = float(series.iloc[-2])
                    new_prices[tk] = price_now

                    chg_1d = (price_now - price_prev) / price_prev * 100

                    chg_15m: Optional[float] = None
                    if tk in prev_prices and prev_prices[tk] > 0:
                        chg_15m = (price_now - prev_prices[tk]) / prev_prices[tk] * 100

                    big_day = abs(chg_1d) >= _ALERT_THRESHOLD_1D
                    big_15m = chg_15m is not None and abs(chg_15m) >= _ALERT_THRESHOLD_15MIN

                    if big_day or big_15m:
                        still_hot.add(tk)
                        # Only alert if this ticker wasn't already in alert state
                        # or if the move has grown by another full threshold increment
                        prev_chg = alerted_tickers.get(tk)
                        is_new = prev_chg is None
                        is_escalating = prev_chg is not None and abs(chg_1d) >= abs(prev_chg) + _ALERT_THRESHOLD_1D
                        if is_new or is_escalating or big_15m:
                            arrow = "⬆️" if chg_1d > 0 else "⬇️"
                            line = f"{arrow} *{tk}*  {chg_1d:+.2f}% today"
                            if big_15m and chg_15m is not None:
                                line += f"  |  {chg_15m:+.2f}% last 15m"
                            alerts.append((abs(chg_1d), line))
                            alerted_tickers[tk] = chg_1d
                except Exception:
                    continue

            # Clear tickers that have dropped back below threshold
            for tk in list(alerted_tickers):
                if tk not in still_hot:
                    del alerted_tickers[tk]

            prev_prices = new_prices

            if alerts:
                alerts.sort(reverse=True)
                now_eat = datetime.now(timezone.utc).hour + _EAT_OFFSET_HOURS
                msg = (
                    f"*Market Alert — {(now_eat % 24):02d}:xx EAT*\n\n"
                    + "\n".join(line for _, line in alerts[:8])
                    + "\n\n_Send /run for a full AI analysis_"
                )
                _send_tg(msg)
                log.info("Price alert sent: %d movers", len(alerts))

                # Broadcast to WebSocket clients
                global _latest_price_msg
                ws_payload = json.dumps({
                    "type": "price_alert",
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "alerts": [{"ticker": line.split("*")[1] if "*" in line else "",
                                "text": line} for _, line in alerts[:8]]
                })
                _latest_price_msg = ws_payload
                dead: List = []
                with _ws_lock:
                    clients = list(_ws_clients)
                for ws in clients:
                    try:
                        asyncio.run(ws.send_text(ws_payload))
                    except Exception:
                        dead.append(ws)
                if dead:
                    with _ws_lock:
                        for ws in dead:
                            _ws_clients.discard(ws)

        except Exception as exc:
            log.warning("Price monitor error: %s", exc)


_DASHBOARD_PORT = 8081

# WebSocket price broadcast — set of live connections
_ws_clients: Set = set()
_ws_lock = threading.Lock()
_latest_price_msg: Optional[str] = None  # last alert, replayed to new connections


def _clean_nan(obj):
    """Recursively replace NaN/Inf floats with None for JSON compliance."""
    import math
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_nan(v) for v in obj]
    return obj


def _build_fastapi_app(out_dir: Path):
    """Build and return the FastAPI application."""
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
    app = FastAPI(title="AI Quant Bot", docs_url=None, redoc_url=None)

    def _serve_dashboard():
        f = out_dir / "dashboard.html"
        if f.exists():
            return FileResponse(str(f), media_type="text/html")
        return JSONResponse({"error": "Dashboard not yet generated — run /run first"}, status_code=503)

    @app.get("/")
    async def dashboard_root():
        return _serve_dashboard()

    @app.get("/dashboard.html")
    async def dashboard_html():
        return _serve_dashboard()

    @app.get("/viz")
    async def viz_3d():
        from src.reports.viz_3d import VIZ_HTML
        return HTMLResponse(content=VIZ_HTML)

    @app.get("/api/snapshot")
    async def snapshot():
        f = out_dir / "snapshot_latest.json"
        if not f.exists():
            return JSONResponse({"error": "No snapshot yet"}, status_code=503)
        return JSONResponse(_clean_nan(json.loads(f.read_text(encoding="utf-8"))))

    @app.get("/api/signals")
    async def signals():
        try:
            from src.db import init_db
            conn = init_db(Path(os.environ.get("DB_PATH", str(out_dir / "bot.db"))))
            rows = [dict(r) for r in conn.execute(
                "SELECT ticker, signal_name, direction, entry_date, entry_price, status "
                "FROM paper_trades WHERE status='open' ORDER BY entry_date DESC LIMIT 30"
            ).fetchall()]
            return JSONResponse({"signals": rows})
        except Exception as exc:
            return JSONResponse({"error": str(exc)}, status_code=500)

    @app.get("/api/holdings/{ticker}")
    async def holdings(ticker: str):
        try:
            from src.db import init_db
            conn = init_db(Path(os.environ.get("DB_PATH", str(out_dir / "bot.db"))))
            row = conn.execute(
                "SELECT * FROM etf_holdings_snapshot WHERE ticker=? ORDER BY snapshot_date DESC LIMIT 1",
                (ticker.upper(),)
            ).fetchone()
            if not row:
                return JSONResponse({"error": f"No holdings data for {ticker}"}, status_code=404)
            d = dict(row)
            if d.get("holdings_json"):
                d["holdings"] = json.loads(d["holdings_json"])
                del d["holdings_json"]
            return JSONResponse(d)
        except Exception as exc:
            return JSONResponse({"error": str(exc)}, status_code=500)

    @app.post("/api/run")
    async def trigger_run_endpoint():
        if not _run_lock.acquire(blocking=False):
            return JSONResponse({"status": "already_running"}, status_code=409)
        _run_lock.release()
        threading.Thread(target=trigger_run, daemon=True, name="api-run").start()
        return JSONResponse({"status": "started"})

    @app.get("/api/backtest")
    async def backtest_endpoint(signal: str = ""):
        try:
            from src.db import init_db
            from src.analysis.backtester import run_backtest, backtest_signal_type, rank_signals
            conn = init_db(Path(os.environ.get("DB_PATH", str(out_dir / "bot.db"))))
            if signal:
                stats = backtest_signal_type(conn, signal)
                return JSONResponse(stats or {"error": f"No data for signal: {signal}"})
            results = run_backtest(conn)
            ranked = rank_signals(results)
            return JSONResponse({"signals": ranked})
        except Exception as exc:
            return JSONResponse({"error": str(exc)}, status_code=500)

    @app.websocket("/ws/prices")
    async def price_stream(websocket: WebSocket):
        await websocket.accept()
        with _ws_lock:
            _ws_clients.add(websocket)
        if _latest_price_msg:
            try:
                await websocket.send_text(_latest_price_msg)
            except Exception:
                pass
        try:
            while True:
                await asyncio.sleep(30)
                await websocket.send_text('{"ping":true}')
        except (WebSocketDisconnect, Exception):
            pass
        finally:
            with _ws_lock:
                _ws_clients.discard(websocket)

    return app


def _start_dashboard_server(out_dir: Path):
    """Start FastAPI + uvicorn on port 8080 in the current thread."""
    import uvicorn
    app = _build_fastapi_app(out_dir)
    log.info("FastAPI dashboard starting at http://localhost:%d/", _DASHBOARD_PORT)
    uvicorn.run(app, host="0.0.0.0", port=_DASHBOARD_PORT, log_level="warning")


def main():
    if not cfg.telegram_token or not cfg.telegram_chat_id:
        print("ERROR: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env")
        sys.exit(1)

    out_dir = project_root / "outputs"
    out_dir.mkdir(exist_ok=True)

    # Start dashboard HTTP server in background thread
    threading.Thread(
        target=_start_dashboard_server, args=(out_dir,),
        daemon=True, name="dashboard-server"
    ).start()

    db_path = Path(os.environ.get("DB_PATH", str(out_dir / "bot.db")))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_conn = init_db(db_path)

    # Start scheduler and price monitor
    threading.Thread(target=_scheduler_loop, daemon=True, name="scheduler").start()
    threading.Thread(target=_price_monitor_loop, daemon=True, name="price-monitor").start()

    advisor = TradingAdvisor(cfg, out_dir, db_conn=db_conn)
    bot = TelegramBot(
        cfg.telegram_token, cfg.telegram_chat_id, out_dir,
        advisor=advisor, db_conn=db_conn, cfg=cfg, project_root=project_root,
    )
    bot.start_polling(run_callback=trigger_run)
    bot.send(
        "*Quant Bot online*\n\n"
        "Auto-runs scheduled at *09:00, 16:30 and 23:00 EAT* daily.\n"
        "Price alerts fire automatically on moves >2.5% intraday.\n\n"
        "Ask me anything about any market:\n"
        "\"What do you think about EUR/USD?\"\n"
        "\"Is gold a buy right now?\"\n"
        "\"Analyze BTC for me\"\n\n"
        "Or use /help for all commands."
    )

    log.info("Telegram listener running — press Ctrl+C to stop")
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log.info("Stopping...")
        bot.stop()


if __name__ == "__main__":
    main()
