"""AI Quant Bot — main orchestrator.

Pipeline:
  1. Load config + secrets
  2. Pull market data (equities, ETFs, FX, commodities)
  3. Pull macro data (FRED)
  4. Pull news (RSS + optional NewsAPI)
  5. Pull global event signals (USGS, NOAA)
  6. Compute features (per-sector snapshots, sector rotation)
  7. Build payload, send to Claude, validate structured response
  8. Render Markdown + HTML reports
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from src.utils.config import load_config
from src.utils.logging_setup import setup_logging
from src.data.market_data import (
    fetch_prices,
    latest_snapshot,
    sector_rotation_scores,
)
from src.data.economic_data import fetch_fred_series, yield_curve_signal
from src.data.news_data import gather_sector_news
from src.data.events_data import gather_events
from src.data.gdelt_data import gather_gdelt
from src.data.worldbank_data import gather_worldbank
from src.data.eia_data import gather_eia
from src.data.weather_global import gather_weather
from src.data.reddit_sentiment import gather_reddit
from src.data.insider_trades import gather_insider_trades
from src.data.google_trends import gather_google_trends
from src.data.macro_events import gather_macro_events
from src.data.short_interest import gather_short_interest
from src.data.etf_holdings import gather_etf_holdings
from src.data.earnings_transcripts import fetch_recent_transcripts
from src.data.economic_surprise import compute_surprise_index
from src.analysis.backtester import run_backtest, rank_signals
from src.data.congress_trades import gather_congress_trades, summarise_by_ticker
from src.data.reuters_rss import fetch_rss_headlines, top_headlines
from src.data.vessel_traffic import gather_vessel_traffic
from src.data.crypto_data import gather_crypto
from src.data.fear_greed import fetch_fear_greed
from src.data.institutional_holdings import fetch_institutional_holdings
from src.data.cboe_data import gather_cboe
from src.utils import activity_log as act
from src.data.satellite_firms import gather_fires
from src.data.satellite_crop import gather_crop_weather
from src.data.satellite_opensky import gather_flight_activity
from src.data.vix_data import gather_vix
from src.data.earnings_calendar import gather_earnings_calendar
from src.data.cot_data import gather_cot
from src.data.options_flow import gather_options_flow
from src.analysis.features import per_sector_snapshot, df_to_records
from src.analysis.claude_analyst import ClaudeAnalyst
from src.analysis.gemini_analyst import GeminiAnalyst
from src.analysis.groq_analyst import GroqAnalyst
from src.analysis.ollama_analyst import OllamaAnalyst
from src.analysis.together_analyst import TogetherAnalyst
from src.journal.trade_journal import load_and_score_journal, save_brief
from src.journal.paper_trader import run_paper_trading, generate_signals
from src.db import init_db
from src.db.price_cache import fetch_prices_cached
from src.db.macro_cache import fetch_fred_cached
from src.db.trade_store import (
    save_regime, get_regime, get_paper_stats, score_open_paper_trades,
    save_paper_trade, save_llm_ideas, score_open_llm_ideas,
    get_llm_performance, start_run, finish_run,
)
from src.reports.markdown_report import render_markdown, write_markdown
from src.reports.html_dashboard import render_html, write_html
from src.reports.telegram_bot import TelegramBot


def build_payload(cfg, prices, etf_prices, fx_prices, bond_prices, intl_prices,
                  fred_df, news, events,
                  gdelt, worldbank, eia, weather, reddit,
                  insider, trends, vix, earnings, cot, options,
                  macro_events, short_interest,
                  satellite_fires, crop_weather, flight_activity,
                  congress_trades=None, reuters_headlines=None,
                  vessel_traffic=None, etf_holdings=None,
                  earnings_transcripts=None, economic_surprise=None,
                  backtest_ranked=None, crypto=None, fear_greed=None,
                  institutional=None, cboe=None) -> Dict[str, Any]:
    """Compose the JSON payload sent to Claude."""
    sectors_snap = per_sector_snapshot(prices, cfg.sectors)
    sectors_payload = {
        sector: df_to_records(df) for sector, df in sectors_snap.items()
    }

    rotation = sector_rotation_scores(etf_prices)
    rotation_records = df_to_records(rotation) if not rotation.empty else []

    fx_snap = latest_snapshot(fx_prices)
    fx_records = df_to_records(fx_snap)

    bond_snap = latest_snapshot(bond_prices)
    bond_records = df_to_records(bond_snap)

    intl_snap = latest_snapshot(intl_prices)
    intl_records = df_to_records(intl_snap)

    macro_records = fred_df.to_dict(orient="records") if not fred_df.empty else []
    yc = yield_curve_signal(fred_df) if not fred_df.empty else {}

    # caps to keep prompt tight
    claude_cfg = cfg.raw.get("claude", {})
    cap_h = claude_cfg.get("max_headlines_in_prompt", 40)
    cap_e = claude_cfg.get("max_events_in_prompt", 15)
    cap_reddit = claude_cfg.get("max_reddit_posts_in_prompt", 25)
    cap_gdelt = claude_cfg.get("max_gdelt_articles_in_prompt", 25)

    news_capped: Dict[str, list] = {}
    remaining = cap_h
    for sector, items in news.items():
        take = min(len(items), max(2, remaining // max(1, len(news))))
        news_capped[sector] = [
            {"title": h["title"], "source": h.get("source", ""), "published": h.get("published", "")[:19]}
            for h in items[:take]
        ]
        remaining -= take

    eonet = events.get("eonet_natural_events", [])
    eonet_relevant = [e for e in eonet if e.get("market_relevant")]
    events_capped = {
        "earthquakes": events.get("earthquakes", [])[:cap_e],
        "weather_alerts": events.get("weather_alerts", [])[:cap_e],
        "eonet_natural_events": eonet_relevant[:cap_e] or eonet[:cap_e],
    }

    # GDELT — keep tone summaries plus a few articles per theme
    gdelt_compact: Dict[str, Any] = {}
    gdelt_articles_taken = 0
    for theme, payload_t in (gdelt or {}).items():
        keep_articles = []
        for art in payload_t.get("articles", []):
            if gdelt_articles_taken >= cap_gdelt:
                break
            keep_articles.append(art)
            gdelt_articles_taken += 1
        gdelt_compact[theme] = {
            "tone": payload_t.get("tone", {}),
            "articles": keep_articles,
        }

    # Reddit — flatten + cap; keep highest-scoring posts
    reddit_flat = []
    for sub, posts in (reddit or {}).items():
        for p in posts:
            reddit_flat.append({"sub": sub, **{k: v for k, v in p.items()
                                                if k in ("title", "score", "comments", "flair")}})
    reddit_flat.sort(key=lambda x: x.get("score") or 0, reverse=True)
    reddit_flat = reddit_flat[:cap_reddit]

    return {
        "as_of_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "macro_indicators_us": macro_records,
        "yield_curve": yc,
        "vix_and_volatility": vix or {},
        "macro_global_worldbank": worldbank or {},
        "energy_eia": eia or {},
        "cot_positioning": cot or [],
        "sector_etfs": cfg.sector_etfs,
        "sector_rotation": rotation_records,
        "sectors": sectors_payload,
        "fx_and_commodities": fx_records,
        "bond_etfs": bond_records,
        "international_etfs": intl_records,
        "news_by_sector": news_capped,
        "gdelt_global_themes": gdelt_compact,
        "global_events": events_capped,
        "weather_economic_locations": weather or [],
        "retail_sentiment_reddit": reddit_flat,
        "insider_trades": insider or [],
        "google_trends": trends or {},
        "earnings_calendar": earnings or [],
        "options_flow": options or [],
        "macro_events": macro_events or [],
        "short_interest": short_interest or [],
        "satellite_fires": satellite_fires or [],
        "crop_weather": crop_weather or [],
        "flight_activity": flight_activity or [],
        "congressional_trades": congress_trades or [],
        "congressional_trades_by_ticker": summarise_by_ticker(congress_trades or []),
        "reuters_headlines": top_headlines(reuters_headlines or []),
        "vessel_traffic": vessel_traffic or [],
        "etf_holdings": etf_holdings or [],
        "earnings_transcripts": earnings_transcripts or [],
        "economic_surprise": economic_surprise or {},
        "backtest_ranked": backtest_ranked or [],
        "crypto": crypto or {},
        "fear_greed": fear_greed or {},
        "institutional": institutional or [],
        "cboe": cboe or {},
    }


def compress_for_llm(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Produce a token-lean version of the payload (<20k chars / ~5k tokens)."""

    # Sectors: one summary row per ticker — last price + key returns only
    sectors_lean: Dict[str, list] = {}
    for sector, records in payload.get("sectors", {}).items():
        if not records:
            continue
        seen: set = set()
        rows = []
        for r in records:
            tk = r.get("ticker") or r.get("index", "")
            if tk in seen:
                continue
            seen.add(tk)
            rows.append({k: r[k] for k in ("ticker", "last", "ret_1d", "ret_1w", "ret_1m", "ret_3m") if k in r})
        sectors_lean[sector] = rows

    # Sector rotation: rank + ticker + 1m only
    rotation_lean = [
        {k: r[k] for k in ("rank", "ticker", "ret_1m", "ret_3m") if k in r}
        for r in payload.get("sector_rotation", [])
    ]

    # FX: ticker + last + ret_1d only
    fx_lean = [
        {k: r[k] for k in ("ticker", "last", "ret_1d", "ret_1m") if k in r}
        for r in payload.get("fx_and_commodities", [])
    ]

    # News: 1 headline per sector, title only
    news_lean = {
        s: [{"title": h["title"]} for h in items[:1]]
        for s, items in payload.get("news_by_sector", {}).items()
    }

    # Options: top 6, signal + ratio only
    options_lean = [
        {"tk": o["ticker"], "pc": o.get("put_call_vol_ratio"), "sig": o.get("signal")}
        for o in (payload.get("options_flow") or [])[:6]
    ]

    # Insider: 6 entries, ticker + filed only
    insider_lean = [
        {"tk": i["ticker"], "filed": i.get("filed")}
        for i in (payload.get("insider_trades") or [])[:6]
    ]

    # Reddit: 5 posts, title only
    reddit_lean = [
        {"sub": p.get("sub"), "title": p.get("title")}
        for p in (payload.get("retail_sentiment_reddit") or [])[:5]
    ]

    # WorldBank: 3 entries
    worldbank = payload.get("macro_global_worldbank") or {}
    worldbank_lean = dict(list(worldbank.items())[:3])

    # EIA: keep as-is (small)
    # COT: keep as-is (small)
    # VIX: keep as-is (small)
    # Macro: keep as-is (small)

    # Bond ETFs: ticker + last + 1d + 1m
    bond_lean = [
        {k: r[k] for k in ("ticker", "last", "ret_1d", "ret_1m") if k in r}
        for r in payload.get("bond_etfs", [])
    ]

    # International ETFs: ticker + last + 1d + 1m
    intl_lean = [
        {k: r[k] for k in ("ticker", "last", "ret_1d", "ret_1m") if k in r}
        for r in payload.get("international_etfs", [])
    ]

    return {
        "as_of": payload.get("as_of_utc", "")[:10],
        "macro": payload.get("macro_indicators_us", []),
        "yield_curve": payload.get("yield_curve", {}),
        "vix": payload.get("vix_and_volatility", {}),
        "cot": payload.get("cot_positioning", []),
        "sector_etfs": payload.get("sector_etfs", {}),
        "sector_rotation": rotation_lean,
        "sectors": sectors_lean,
        "fx": fx_lean,
        "bond_etfs": bond_lean,
        "international_etfs": intl_lean,
        "energy": payload.get("energy_eia", {}),
        "worldbank": worldbank_lean,
        "news": news_lean,
        "events": payload.get("global_events", {}),
        "reddit": reddit_lean,
        "insider": insider_lean,
        "earnings": payload.get("earnings_calendar", []),
        "options": options_lean,
        "macro_events": payload.get("macro_events", []),
        "short_interest": [
            {k: r[k] for k in ("ticker", "short_pct_float", "days_to_cover", "signal") if k in r}
            for r in (payload.get("short_interest") or [])[:8]
        ],
        "satellite_fires": [
            {k: r[k] for k in ("region", "fire_count", "signal", "affected_crops", "related_tickers") if k in r}
            for r in (payload.get("satellite_fires") or []) if r.get("signal") != "clear"
        ],
        "crop_weather": [
            {k: r[k] for k in ("region", "crops", "signal", "avg_temp_c", "precip_30d_mm", "in_growing_season") if k in r}
            for r in (payload.get("crop_weather") or [])
        ],
        "flight_activity": [
            {k: r[k] for k in ("region", "flight_count", "signal", "ratio_vs_baseline") if k in r}
            for r in (payload.get("flight_activity") or []) if r.get("signal") != "normal"
        ],
        "congressional_trades": [
            {k: r[k] for k in ("name", "party", "chamber", "ticker", "trade_type", "amount", "trade_date") if k in r}
            for r in (payload.get("congressional_trades") or [])[:20]
        ],
        "congressional_by_ticker": payload.get("congressional_trades_by_ticker", [])[:15],
        "reuters_headlines": [
            {"source": h["source"], "category": h["category"], "title": h["title"]}
            for h in (payload.get("reuters_headlines") or [])[:12]
        ],
        "vessel_traffic": [
            {k: r[k] for k in ("zone", "commodity", "signal", "ratio_vs_baseline",
                               "total_vessels", "tankers", "interpretation", "related_tickers")
             if k in r}
            for r in (payload.get("vessel_traffic") or [])
            if r.get("signal") != "normal"
        ],
        "economic_surprise": {
            k: v for k, v in (payload.get("economic_surprise") or {}).items()
            if k in ("composite_score", "regime", "signal", "rationale")
        },
        "earnings_transcripts": [
            {k: t[k] for k in ("ticker", "date", "tone", "guidance", "themes") if k in t}
            for t in (payload.get("earnings_transcripts") or [])[:8]
        ],
        "fear_greed": {
            k: v for k, v in (payload.get("fear_greed") or {}).items()
            if k in ("value", "label", "signal", "trend", "rationale")
        },
        "crypto_regime": payload.get("crypto", {}).get("regime", {}),
        "cboe": {
            k: v for k, v in (payload.get("cboe") or {}).items()
            if k in ("equity_pc", "avg_5d", "signal", "interpretation")
        },
    }


def _compute_rv_iv_signals(payload: Dict[str, Any]) -> list:
    """Compare realized vol (GBM σ) vs implied vol (options IV) per ticker."""
    from src.analysis.stochastic import rv_vs_iv_signal
    results = []
    options = payload.get("options_flow") or []
    # Build realized vol lookup from fx + sector records
    rv_lookup: Dict[str, float] = {}
    for r in payload.get("fx_and_commodities", []):
        tk = r.get("ticker", "")
        if tk and r.get("gbm_sigma"):
            rv_lookup[tk] = r["gbm_sigma"]
    for sector_records in payload.get("sectors", {}).values():
        for r in sector_records:
            tk = r.get("ticker", "")
            if tk and r.get("gbm_sigma") and tk not in rv_lookup:
                rv_lookup[tk] = r["gbm_sigma"]
    for opt in options:
        tk = opt.get("ticker", "")
        iv_pct = opt.get("atm_iv_pct")
        if not tk or iv_pct is None:
            continue
        rv = rv_lookup.get(tk)
        if rv is None:
            continue
        implied_vol = iv_pct / 100.0
        sig = rv_vs_iv_signal(rv, implied_vol, tk)
        if sig:
            results.append(sig)
    return results


def _build_ticker_returns(payload: Dict[str, Any], rotation_records: list) -> Dict[str, Dict]:
    """Build ticker → {ret_1d, ret_1w, ret_1m, ret_3m} for mini charts."""
    out: Dict[str, Dict] = {}
    _keys = ("ret_1d", "ret_1w", "ret_1m", "ret_3m")

    for r in rotation_records:
        tk = r.get("ticker", "")
        if tk:
            out[tk] = {k: r.get(k) for k in _keys}

    for sector_records in payload.get("sectors", {}).values():
        for r in sector_records:
            tk = r.get("ticker") or r.get("index", "")
            if tk and tk not in out:
                out[tk] = {k: r.get(k) for k in _keys}

    for r in payload.get("fx_and_commodities", []):
        tk = r.get("ticker", "")
        if tk and tk not in out:
            out[tk] = {k: r.get(k) for k in _keys}

    for r in payload.get("bond_etfs", []):
        tk = r.get("ticker", "")
        if tk and tk not in out:
            out[tk] = {k: r.get(k) for k in _keys}

    for r in payload.get("international_etfs", []):
        tk = r.get("ticker", "")
        if tk and tk not in out:
            out[tk] = {k: r.get(k) for k in _keys}

    return out


def build_snapshot_for_reports(payload, rotation_records,
                               journal_entries=None, performance=None,
                               paper_stats=None, open_trades=None) -> Dict[str, Any]:
    return {
        "macro": payload.get("macro_indicators_us", []),
        "yield_curve": payload.get("yield_curve", {}),
        "vix": payload.get("vix_and_volatility", {}),
        "sector_rotation": rotation_records,
        "fx": payload.get("fx_and_commodities", []),
        "events": payload.get("global_events", {}),
        "energy_eia": payload.get("energy_eia", {}),
        "worldbank": payload.get("macro_global_worldbank", {}),
        "gdelt": payload.get("gdelt_global_themes", {}),
        "weather": payload.get("weather_economic_locations", []),
        "reddit": payload.get("retail_sentiment_reddit", []),
        "cot": payload.get("cot_positioning", []),
        "insider": payload.get("insider_trades", []),
        "earnings": payload.get("earnings_calendar", []),
        "options": payload.get("options_flow", []),
        "bond_etfs": payload.get("bond_etfs", []),
        "international_etfs": payload.get("international_etfs", []),
        "macro_events": payload.get("macro_events", []),
        "short_interest": payload.get("short_interest", []),
        "satellite_fires": payload.get("satellite_fires", []),
        "crop_weather": payload.get("crop_weather", []),
        "flight_activity": payload.get("flight_activity", []),
        "congressional_trades": payload.get("congressional_trades", []),
        "congressional_by_ticker": payload.get("congressional_trades_by_ticker", []),
        "reuters_headlines": payload.get("reuters_headlines", []),
        "vessel_traffic": payload.get("vessel_traffic", []),
        "stochastic_signals": payload.get("stochastic_signals", []),
        "etf_holdings": payload.get("etf_holdings", []),
        "earnings_transcripts": payload.get("earnings_transcripts", []),
        "economic_surprise": payload.get("economic_surprise", {}),
        "backtest_ranked": payload.get("backtest_ranked", []),
        "crypto": payload.get("crypto", {}),
        "fear_greed": payload.get("fear_greed", {}),
        "institutional": payload.get("institutional", []),
        "cboe": payload.get("cboe", {}),
        "sector_etfs_map": payload.get("sector_etfs", {}),
        "ticker_returns": _build_ticker_returns(payload, rotation_records),
        "journal_entries": (journal_entries or [])[-5:],
        "performance": performance or {},
        "paper_stats": paper_stats or {},
        "open_trades": open_trades or [],
    }


def _is_online() -> bool:
    """Quick DNS check — returns False if the machine has no internet."""
    import socket
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False


def run() -> int:
    import time
    project_root = Path(__file__).resolve().parent
    cfg = load_config(project_root)
    log = setup_logging(cfg.log_level, log_dir=project_root / "logs")
    log.info("=== AI Quant Bot run starting ===")
    t_start = time.time()

    if not _is_online():
        log.warning("NO INTERNET CONNECTION — all external fetches will fail. "
                    "Will use DB cache where available and cached brief as fallback.")

    if cfg.llm_provider == "anthropic" and not cfg.anthropic_api_key:
        log.error("ANTHROPIC_API_KEY not set.")
        return 2
    if cfg.llm_provider == "gemini" and not cfg.gemini_api_key:
        log.error("GEMINI_API_KEY not set.")
        return 2
    if cfg.llm_provider == "groq" and not cfg.groq_api_key:
        log.error("GROQ_API_KEY not set. Get a free key at console.groq.com")
        return 2
    if cfg.llm_provider == "ollama":
        log.info("Using Ollama at %s (model: %s)", cfg.ollama_host, cfg.ollama_model)

    # Telegram — send notifications only (polling handled by telegram_listener.py)
    tg: TelegramBot | None = None
    if cfg.telegram_token and cfg.telegram_chat_id:
        out_dir_early = project_root / "outputs"
        out_dir_early.mkdir(exist_ok=True)
        tg = TelegramBot(cfg.telegram_token, cfg.telegram_chat_id, out_dir_early)
        tg.send("Run started — pulling market data...")
        log.info("Telegram notifications enabled (chat_id=%s)", cfg.telegram_chat_id)
    else:
        log.info("Telegram not configured (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env to enable)")

    # 0. Init DB
    out_dir = project_root / "outputs"
    out_dir.mkdir(exist_ok=True)
    act.init(out_dir)
    act.log("Run started", "info", "startup")
    db_path = Path(os.environ.get("DB_PATH", str(out_dir / "bot.db")))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = init_db(db_path)
    log.info("DB ready: %s", db_path)

    today = datetime.now().strftime("%Y-%m-%d")
    run_id = start_run(conn, today, cfg.llm_provider,
                       cfg.groq_model if cfg.llm_provider == "groq" else
                       cfg.gemini_model if cfg.llm_provider == "gemini" else cfg.claude_model)

    # 1. Tickers
    all_tickers: list[str] = []
    for tks in cfg.sectors.values():
        all_tickers.extend(tks)
    etf_tickers = list(cfg.sector_etfs.values())
    fx_tickers = list(cfg.fx_commodities.values())
    bond_tickers = list(cfg.bond_etfs.values())
    intl_tickers = list(cfg.international_etfs.values())

    # 2. Market data — DB cache (only fetches missing days)
    act.log(f"Fetching prices for {len(all_tickers)} equities, {len(etf_tickers)} ETFs, {len(fx_tickers)} FX/commodities", "info", "market_data")
    log.info("Fetching equity prices (cached)…")
    prices = fetch_prices_cached(conn, all_tickers, lookback_days=cfg.lookback_days)
    act.log(f"Equity prices loaded ({len(prices.columns) if not prices.empty else 0} tickers)", "success", "market_data")
    log.info("Fetching sector ETF prices (cached)…")
    etf_prices = fetch_prices_cached(conn, etf_tickers, lookback_days=cfg.lookback_days)
    log.info("Fetching FX & commodities (cached)…")
    fx_prices = fetch_prices_cached(conn, fx_tickers, lookback_days=cfg.lookback_days)
    act.log(f"FX & commodities loaded ({len(fx_prices.columns) if not fx_prices.empty else 0} pairs)", "success", "market_data")
    log.info("Fetching bond ETF prices (cached)…")
    bond_prices = fetch_prices_cached(conn, bond_tickers, lookback_days=cfg.lookback_days)
    log.info("Fetching international ETF prices (cached)…")
    intl_prices = fetch_prices_cached(conn, intl_tickers, lookback_days=cfg.lookback_days)
    act.log(f"International ETFs loaded ({len(intl_prices.columns) if not intl_prices.empty else 0} markets)", "success", "market_data")

    # 3. Macro — DB cache (weekly TTL)
    act.log("Fetching FRED macro indicators (GDP, CPI, Fed Funds, yield curve...)", "info", "macro")
    log.info("Fetching FRED macro (cached)…")
    fred_df = fetch_fred_cached(conn, cfg.fred_series, cfg.fred_api_key)
    act.log(f"FRED macro loaded ({len(fred_df)} series)", "success", "macro")

    # 4. News
    act.log("Pulling news from RSS feeds + sector keywords", "info", "news")
    log.info("Pulling news…")
    news_cfg = cfg.raw.get("news", {})
    news = gather_sector_news(
        sector_keywords=news_cfg.get("sector_keywords", {}),
        rss_feeds=news_cfg.get("rss_feeds", []),
        newsapi_key=cfg.newsapi_key,
        max_per_sector=news_cfg.get("max_headlines_per_sector", 8),
    )
    total_headlines = sum(len(v) for v in news.values())
    act.log(f"News pulled: {total_headlines} headlines across {len(news)} sectors", "success", "news")

    # ── Helper: run any fetch with a hard timeout ─────────────────────────────
    import concurrent.futures as _cf

    def _timed(fn, *args, timeout: int = 45, default=None, name: str = ""):
        """Run fn(*args) in a thread; return default if it takes longer than timeout s."""
        label = name or fn.__name__
        act.log(f"Fetching {label}...", "info", "data_pull")
        with _cf.ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(fn, *args)
            try:
                result = fut.result(timeout=timeout)
                n = len(result) if hasattr(result, "__len__") else ""
                act.log(f"{label} done{f' ({n} items)' if n else ''}", "success", "data_pull")
                return result
            except _cf.TimeoutError:
                log.warning("%s timed out after %ds — skipping", label, timeout)
                act.log(f"{label} timed out after {timeout}s — skipped", "warning", "data_pull")
                if tg:
                    tg.send(f"⚠️ {label} timed out — skipping and continuing.")
                return default
            except Exception as exc:
                log.warning("%s failed: %s — skipping", label, exc)
                act.log(f"{label} failed: {str(exc)[:80]}", "error", "data_pull")
                return default

    # 5. Events + additional sources — all guarded by timeouts
    log.info("Pulling global events…")
    ev_cfg = cfg.raw.get("events", {})
    events = _timed(
        gather_events,
        ev_cfg.get("earthquakes_min_magnitude", 5.5),
        ev_cfg.get("weather_severity_min", "severe"),
        timeout=30, default={}, name="Global events",
    )

    gdelt = {}
    if tg:
        tg.send("Data pull: events ✓ | fetching macro + energy…")

    log.info("Pulling World Bank macro…")
    worldbank = _timed(gather_worldbank, timeout=60, default={}, name="World Bank")

    log.info("Pulling EIA energy data…")
    eia = _timed(gather_eia, cfg.eia_api_key, timeout=60, default={}, name="EIA energy")

    log.info("Pulling global weather…")
    weather = _timed(gather_weather, timeout=45, default=[], name="Weather")

    if tg:
        tg.send("Data pull: macro + energy ✓ | fetching sentiment + flows…")

    log.info("Pulling Reddit sentiment…")
    reddit = _timed(gather_reddit, timeout=30, default=[], name="Reddit")

    log.info("Pulling VIX & volatility…")
    vix = _timed(gather_vix, timeout=30, default={}, name="VIX")

    log.info("Pulling COT positioning…")
    cot = _timed(gather_cot, timeout=60, default=[], name="COT")

    log.info("Pulling earnings calendar…")
    earnings = _timed(gather_earnings_calendar, all_tickers, timeout=45, default=[], name="Earnings")

    log.info("Pulling options flow…")
    options = _timed(gather_options_flow, all_tickers, timeout=90, default=[], name="Options flow")

    log.info("Pulling insider trades…")
    insider = _timed(gather_insider_trades, all_tickers, timeout=45, default=[], name="Insider trades")

    log.info("Pulling Google Trends…")
    trends_keywords = list(cfg.sectors.keys()) + all_tickers[:10]
    trends = _timed(gather_google_trends, trends_keywords, timeout=45, default={}, name="Google Trends")

    log.info("Pulling macro events calendar…")
    macro_events = _timed(gather_macro_events, 21, timeout=30, default=[], name="Macro events")

    log.info("Pulling short interest…")
    short_interest = _timed(gather_short_interest, all_tickers, timeout=45, default=[], name="Short interest")

    log.info("Pulling ETF holdings (top holdings + AUM + NAV)…")
    _skip_etfs = {"NGE", "EGPT"}
    _all_etf_tickers = [
        t for t in (
            list(cfg.sector_etfs.values()) +
            list(cfg.bond_etfs.values()) +
            list(cfg.international_etfs.values())
        ) if t not in _skip_etfs
    ]
    etf_holdings_data = _timed(gather_etf_holdings, _all_etf_tickers, conn,
                               timeout=180, default=[], name="ETF holdings")

    log.info("Fetching earnings transcripts (SEC 8-K + LLM sentiment)…")
    _transcript_tickers = [t for t in all_tickers[:15] if "." not in t]
    earnings_transcripts = _timed(fetch_recent_transcripts, _transcript_tickers,
                                  timeout=180, default=[], name="Earnings transcripts")

    log.info("Computing Economic Surprise Index from FRED cache…")
    economic_surprise = _timed(compute_surprise_index, conn,
                               timeout=10, default={}, name="Economic Surprise Index")

    log.info("Running signal backtest from DB trades…")
    backtest_results = _timed(run_backtest, conn, timeout=15, default={}, name="Backtest")
    backtest_ranked = rank_signals(backtest_results) if backtest_results else []

    log.info("Pulling congressional trades (STOCK Act)…")
    congress_trades = _timed(gather_congress_trades, timeout=45, default=[], name="Congress trades")

    log.info("Pulling Reuters/financial RSS headlines…")
    reuters_raw = _timed(fetch_rss_headlines, timeout=30, default=[], name="Reuters RSS")

    log.info("Pulling vessel traffic (Vessel API)…")
    vessel_traffic = _timed(gather_vessel_traffic, cfg.vessel_api_key,
                            timeout=60, default=[], name="Vessel traffic")

    log.info("Pulling crypto prices (CoinGecko)…")
    crypto_data = _timed(gather_crypto, timeout=15, default={}, name="Crypto")

    log.info("Fetching Fear & Greed Index…")
    fear_greed = _timed(fetch_fear_greed, timeout=10, default=None, name="Fear & Greed")

    log.info("Fetching institutional 13F holdings (SEC EDGAR)…")
    institutional = _timed(fetch_institutional_holdings, timeout=60, default=[], name="13F holdings")

    log.info("Fetching CBOE put/call ratio…")
    cboe = _timed(gather_cboe, timeout=15, default=None, name="CBOE put/call")

    if tg:
        tg.send("Data pull: flows + sentiment ✓ | fetching satellite data…")

    sat_cfg = cfg.raw.get("satellite", {})
    log.info("Pulling satellite fire data (NASA FIRMS)…")
    satellite_fires = (
        _timed(gather_fires, cfg.firms_api_key, timeout=30, default=[], name="NASA FIRMS")
        if sat_cfg.get("firms_enabled", True) else []
    )

    log.info("Pulling satellite crop weather (NASA POWER)…")
    crop_weather = (
        _timed(gather_crop_weather, timeout=45, default=[], name="NASA POWER crop")
        if sat_cfg.get("crop_weather_enabled", True) else []
    )

    log.info("Pulling flight activity (OpenSky)…")
    flight_activity = (
        _timed(gather_flight_activity, timeout=30, default=[], name="OpenSky flights")
        if sat_cfg.get("opensky_enabled", True) else []
    )

    if tg:
        tg.send("All data collected ✓ | running LLM analysis…")

    # 6. Build payload
    payload = build_payload(cfg, prices, etf_prices, fx_prices, bond_prices, intl_prices,
                            fred_df, news, events,
                            gdelt, worldbank, eia, weather, reddit,
                            insider, trends, vix, earnings, cot, options,
                            macro_events, short_interest,
                            satellite_fires, crop_weather, flight_activity,
                            congress_trades=congress_trades,
                            reuters_headlines=reuters_raw,
                            vessel_traffic=vessel_traffic,
                            etf_holdings=etf_holdings_data,
                            earnings_transcripts=earnings_transcripts,
                            economic_surprise=economic_surprise,
                            backtest_ranked=backtest_ranked,
                            crypto=crypto_data,
                            fear_greed=fear_greed,
                            institutional=institutional,
                            cboe=cboe)

    # Save raw payload for debugging — overwrite single file to avoid accumulation
    (out_dir / "payload_latest.json").write_text(
        json.dumps(payload, indent=2, default=str), encoding="utf-8"
    )

    # 6b. Save regime snapshot to DB
    act.log("Building market payload and saving regime snapshot", "info", "analysis")
    save_regime(conn, today, payload)
    regime = get_regime(conn, today)

    # 6c. Score open DB trades + LLM ideas
    log.info("Scoring open trades in DB…")
    n_paper = score_open_paper_trades(conn)
    n_llm = score_open_llm_ideas(conn)
    if n_paper or n_llm:
        log.info("Scored %d paper trades, %d LLM ideas", n_paper, n_llm)
        act.log(f"Scored {n_paper} paper trades, {n_llm} LLM ideas against actual prices", "success", "scoring")

    # 6d. Paper trading signals — generate + store new ones
    log.info("Generating paper trading signals…")
    act.log("Generating systematic paper trading signals...", "info", "signals")
    signals = generate_signals(payload, prices_df=prices)
    for sig in signals:
        import yfinance as yf
        try:
            h = yf.Ticker(sig["ticker"]).history(period="2d", auto_adjust=True)
            ep = float(h["Close"].dropna().iloc[-1]) if not h.empty else None
        except Exception:
            ep = None
        save_paper_trade(conn, {**sig, "run_date": today,
                                "entry_date": today, "entry_price": ep}, regime)
        direction = sig.get("direction", "").upper()
        ticker = sig.get("ticker", "")
        signal_name = sig.get("signal_name", "").replace("_", " ")
        act.log(f"Signal: {direction} {ticker} [{signal_name}] — {sig.get('rationale', '')[:80]}", "decision", "signals")

    paper_stats = get_paper_stats(conn)
    paper_stats["new_signals_today"] = len(signals)
    log.info("Paper trading: win_rate=%.1f%%, %d total scored, %d new signals",
             paper_stats["win_rate_pct"], paper_stats["total_trades"], len(signals))
    act.log(f"Paper trading: {len(signals)} new signals, win rate {paper_stats['win_rate_pct']:.1f}% overall", "success", "signals")

    open_trades = [dict(r) for r in conn.execute(
        "SELECT * FROM paper_trades WHERE status='open' ORDER BY entry_date DESC"
    ).fetchall()]

    # 6e. LLM performance from DB (for self-correction prompt)
    performance = get_llm_performance(conn)
    # Also load JSON journal for backward compat display
    journal_path = out_dir / "journal.json"
    journal_entries, _ = load_and_score_journal(journal_path)

    # RV vs IV stochastic signals
    stochastic_signals = _compute_rv_iv_signals(payload)
    payload["stochastic_signals"] = stochastic_signals
    if stochastic_signals:
        log.info("Stochastic signals: %d RV/IV signals", len(stochastic_signals))

    # snapshot copy for reports
    rotation_records = payload["sector_rotation"]
    snapshot = build_snapshot_for_reports(payload, rotation_records, journal_entries, performance, paper_stats, open_trades)
    (out_dir / "snapshot_latest.json").write_text(
        json.dumps(snapshot, indent=2, default=str), encoding="utf-8"
    )

    # 7. LLM analyst
    llm_cfg = cfg.raw.get("claude", {})
    if cfg.llm_provider == "groq":
        analyst = GroqAnalyst(
            api_key=cfg.groq_api_key,
            model=cfg.groq_model,
            max_tokens=llm_cfg.get("max_tokens", 4096),
            temperature=llm_cfg.get("temperature", 0.3),
        )
    elif cfg.llm_provider == "gemini":
        analyst = GeminiAnalyst(
            api_key=cfg.gemini_api_key,
            model=cfg.gemini_model,
            max_tokens=llm_cfg.get("max_tokens", 4096),
            temperature=llm_cfg.get("temperature", 0.3),
        )
    elif cfg.llm_provider == "ollama":
        analyst = OllamaAnalyst(
            host=cfg.ollama_host,
            model=cfg.ollama_model,
            max_tokens=llm_cfg.get("max_tokens", 4096),
            temperature=llm_cfg.get("temperature", 0.3),
        )
    else:
        analyst = ClaudeAnalyst(
            api_key=cfg.anthropic_api_key,
            model=cfg.claude_model,
            max_tokens=llm_cfg.get("max_tokens", 4096),
            temperature=llm_cfg.get("temperature", 0.3),
        )
    log.info("Calling LLM for the brief…")
    act.log(f"Sending market data to {cfg.llm_provider.upper()} for analysis ({len(json.dumps(compress_for_llm(payload), default=str))//1000}k chars)...", "info", "llm")
    llm_payload = compress_for_llm(payload)
    log.info("Compressed payload: ~%d chars", len(json.dumps(llm_payload, default=str)))
    try:
        brief = analyst.analyze(llm_payload, performance=performance, paper_stats=paper_stats)
    except Exception as primary_exc:
        exc_str = str(primary_exc).lower()
        is_rate_limit = "rate_limit" in exc_str or "429" in exc_str
        is_connection = any(k in exc_str for k in ("connection", "connect", "network", "getaddrinfo", "timeout", "unreachable"))
        is_groq = cfg.llm_provider == "groq"

        if not (is_rate_limit or is_connection):
            raise

        if is_connection:
            log.warning("LLM connection error (%s) — trying fallback providers", type(primary_exc).__name__)
        else:
            log.warning("Groq rate limit hit — trying fallback providers")

        brief = None

        # Hop 1: Together.ai
        if cfg.together_api_key and brief is None:
            try:
                if tg:
                    tg.send("Groq daily limit reached — switching to Together.ai.")
                log.info("Fallback 1: Together.ai")
                together = TogetherAnalyst(
                    api_key=cfg.together_api_key,
                    model=cfg.together_model,
                    max_tokens=llm_cfg.get("max_tokens", 4096),
                    temperature=llm_cfg.get("temperature", 0.3),
                )
                brief = together.analyze(llm_payload, performance=performance, paper_stats=paper_stats)
            except Exception as together_exc:
                log.warning("Together.ai fallback failed: %s", together_exc)

        # Hop 2: Gemini — try multiple models in case one quota is exhausted
        if cfg.gemini_api_key and brief is None:
            gemini_models = [cfg.gemini_model, "gemini-2.5-flash", "gemini-2.5-flash-lite"]
            # Deduplicate while preserving order
            seen: set = set()
            gemini_models = [m for m in gemini_models if not (m in seen or seen.add(m))]
            for gmodel in gemini_models:
                if brief is not None:
                    break
                try:
                    if tg:
                        tg.send(f"Trying Gemini ({gmodel})…")
                    log.info("Fallback 2: Gemini (%s)", gmodel)
                    gemini = GeminiAnalyst(
                        api_key=cfg.gemini_api_key,
                        model=gmodel,
                        max_tokens=llm_cfg.get("max_tokens", 4096),
                        temperature=llm_cfg.get("temperature", 0.3),
                    )
                    brief = gemini.analyze(llm_payload, performance=performance, paper_stats=paper_stats)
                    log.info("Gemini (%s) succeeded", gmodel)
                except Exception as gemini_exc:
                    log.warning("Gemini/%s failed: %s", gmodel, gemini_exc)

        if brief is None:
            # Last resort: reuse the cached brief from the previous run so the
            # dashboard and reports are still refreshed with new market data.
            cached_brief_path = out_dir / "brief_latest.json"
            if cached_brief_path.exists():
                from src.analysis.schemas import TradeBrief
                try:
                    cached_data = json.loads(cached_brief_path.read_text(encoding="utf-8"))
                    brief = TradeBrief(**cached_data)
                    log.warning("All LLM providers failed — using cached brief from previous run")
                    act.log("LLM unavailable — dashboard rebuilt with cached analysis", "warning", "llm")
                    if tg:
                        tg.send(
                            "All LLM providers unreachable (network issue or rate limit).\n"
                            "Dashboard rebuilt with cached analysis from previous run.\n"
                            "Groq resets at midnight UTC. Try /run again later."
                        )
                except Exception as cache_exc:
                    log.error("Could not load cached brief: %s", cache_exc)
                    brief = None

            if brief is None:
                if tg:
                    tg.send(
                        "All LLM providers exhausted and no cached brief found.\n"
                        "Groq resets at midnight UTC. Try /run again after midnight."
                    )
                raise RuntimeError(f"All LLM providers failed. Primary: {primary_exc}")

    act.log(f"LLM analysis complete — {len(brief.short_term_ideas)} short-term ideas, {len(brief.long_term_ideas)} long-term ideas, {len(brief.risk_flags)} risk flags", "success", "llm")
    for idea in brief.short_term_ideas[:5]:
        act.log(f"Idea: {idea.direction.upper()} {idea.ticker} [{idea.conviction}] — {idea.thesis[:80]}", "decision", "llm")
    for flag in brief.risk_flags[:3]:
        act.log(f"Risk flag [{flag.severity.upper()}]: {flag.flag}", "warning" if flag.severity != "high" else "error", "llm")

    # 7b. Save LLM ideas to DB + JSON journal
    from src.data.market_data import latest_snapshot as _snap
    all_snap = _snap(prices)
    price_snap, vol_snap = {}, {}
    if not all_snap.empty:
        for tk in all_snap.index:
            price_snap[tk] = float(all_snap.loc[tk, "last"])
            v = all_snap.loc[tk, "vol_1m_ann"]
            if v is not None:
                vol_snap[tk] = float(v)

    save_llm_ideas(conn, brief.model_dump(), price_snap, vol_snap, regime)
    save_brief(brief, price_snap, vol_snap, journal_path)  # keep JSON for display

    # 8. Reports — always overwrite fixed filenames; dated copies kept for briefs only
    md = render_markdown(brief, snapshot)
    md_path = write_markdown(md, out_dir / "brief_latest.md")
    html = render_html(brief, snapshot)
    html_path = write_html(html, out_dir / "dashboard.html")

    # Save brief as JSON for Telegram commands
    brief_dict = brief.model_dump()
    brief_json = json.dumps(brief_dict, indent=2, default=str)
    (out_dir / "brief_latest.json").write_text(brief_json, encoding="utf-8")

    # Save paper stats snapshot for /status command
    (out_dir / "paper_stats_latest.json").write_text(
        json.dumps(paper_stats, default=str), encoding="utf-8"
    )

    duration = time.time() - t_start
    llm_payload_chars = len(json.dumps(compress_for_llm(payload), default=str))
    finish_run(conn, run_id, duration, llm_payload_chars, len(signals),
               paper_stats.get("win_rate_pct", 0), paper_stats.get("avg_pnl_pct", 0))

    log.info("Wrote %s", md_path)
    log.info("Wrote %s", html_path)
    log.info("=== Run complete in %.1fs ===", duration)
    act.log(f"Run complete in {duration:.0f}s — dashboard updated", "success", "done")

    # Push Telegram summary
    if tg:
        tg.send_run_summary(brief_dict, paper_stats)

    return 0


if __name__ == "__main__":
    try:
        sys.exit(run())
    except KeyboardInterrupt:
        print("Interrupted.")
        sys.exit(130)
    except Exception as exc:
        logging.exception("Fatal error: %s", exc)
        # Try to notify Telegram that the run failed
        try:
            _cfg = load_config(Path(__file__).resolve().parent)
            if _cfg.telegram_token and _cfg.telegram_chat_id:
                from src.reports.telegram_bot import TelegramBot as _TG
                _tg = _TG(_cfg.telegram_token, _cfg.telegram_chat_id,
                          Path(__file__).resolve().parent / "outputs")
                _tg.send(f"Run failed: {type(exc).__name__}: {str(exc)[:200]}\n\nCheck logs for details.")
        except Exception:
            pass
        sys.exit(1)
