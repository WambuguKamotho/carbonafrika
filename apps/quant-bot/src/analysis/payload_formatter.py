"""Convert raw payload dict into compact natural-language text for the LLM.

JSON is ~4 chars/token. Plain text is ~5 chars/token but carries far less
structural overhead — no brackets, quotes, colons. Net result: ~3-4x fewer
tokens for the same information.
"""
from __future__ import annotations

from typing import Any, Dict


def _pct(v) -> str:
    if v is None:
        return "n/a"
    try:
        return f"{float(v)*100:+.1f}%"
    except Exception:
        return str(v)


def _val(v, decimals: int = 2) -> str:
    if v is None:
        return "n/a"
    try:
        return f"{float(v):.{decimals}f}"
    except Exception:
        return str(v)


def format_payload_as_text(payload: Dict[str, Any]) -> str:
    lines: list[str] = []
    a = lines.append

    a(f"DATE: {payload.get('as_of', payload.get('as_of_utc', ''))[:10]}")
    a("")

    # Macro
    macro = payload.get("macro_indicators_us") or payload.get("macro", [])
    if macro:
        a("## US MACRO")
        for m in macro:
            yoy = f", YoY {_pct(m.get('yoy_pct'))}" if m.get("yoy_pct") is not None else ""
            a(f"  {m.get('name')}: {m.get('latest')}{yoy} (as of {str(m.get('as_of',''))[:10]})")

    # Yield curve
    yc = payload.get("yield_curve") or {}
    if yc:
        status = "INVERTED" if yc.get("inverted") else "normal"
        a(f"\n## YIELD CURVE\n  10y-2y spread: {yc.get('spread_bps')} bps ({status}), 10y={yc.get('10y')}, 2y={yc.get('2y')}")

    # VIX
    vix = payload.get("vix_and_volatility") or payload.get("vix") or {}
    if vix:
        a("\n## VOLATILITY")
        spot = vix.get("vix_spot") or {}
        v3m = vix.get("vix3m") or {}
        move = vix.get("move") or {}
        if spot:
            a(f"  VIX spot: {spot.get('last')} ({spot.get('1d_chg'):+.2f} today)")
        if v3m:
            a(f"  VIX 3m: {v3m.get('last')}")
        if move:
            a(f"  MOVE (bond vol): {move.get('last')}")
        ts = vix.get("term_structure") or {}
        if ts:
            a(f"  Term structure: {ts.get('signal')} ({ts.get('vix3m_minus_spot'):+.2f} pts)")

    # COT
    cot = payload.get("cot_positioning") or payload.get("cot") or []
    if cot:
        a("\n## COT POSITIONING (institutional futures)")
        for c in cot:
            a(f"  {c.get('market')}: AM net long {c.get('asset_mgr_net_long'):+,}, LF net long {c.get('lev_fund_net_long'):+,} (as of {c.get('as_of','')})")

    # Sector rotation
    rotation = payload.get("sector_rotation", [])
    if rotation:
        a("\n## SECTOR ETF MOMENTUM (ranked)")
        for r in rotation:
            a(f"  #{r.get('rank')} {r.get('ticker')}: 1m {_pct(r.get('ret_1m'))}, 3m {_pct(r.get('ret_3m'))}")

    # Sectors
    sectors = payload.get("sectors") or {}
    if sectors:
        a("\n## SECTOR SNAPSHOTS")
        for sector, rows in sectors.items():
            tickers = []
            for r in (rows or []):
                tk = r.get("ticker") or r.get("index", "")
                if not tk:
                    continue
                tickers.append(
                    f"{tk} ${_val(r.get('last'))} "
                    f"(1d {_pct(r.get('ret_1d'))} 1w {_pct(r.get('ret_1w'))} 1m {_pct(r.get('ret_1m'))} 3m {_pct(r.get('ret_3m'))})"
                )
            if tickers:
                a(f"  {sector}: " + " | ".join(tickers))

    # FX & commodities
    fx = payload.get("fx_and_commodities") or payload.get("fx") or []
    if fx:
        a("\n## FX & COMMODITIES")
        parts = []
        for r in fx:
            tk = r.get("ticker") or r.get("index", "")
            parts.append(f"{tk} {_val(r.get('last'))} (1d {_pct(r.get('ret_1d'))} 1m {_pct(r.get('ret_1m'))})")
        a("  " + " | ".join(parts))

    # Bond ETFs
    bond_etfs = payload.get("bond_etfs") or []
    if bond_etfs:
        a("\n## BOND ETFs")
        parts = []
        for r in bond_etfs:
            tk = r.get("ticker") or r.get("index", "")
            parts.append(f"{tk} ${_val(r.get('last'))} (1d {_pct(r.get('ret_1d'))} 1m {_pct(r.get('ret_1m'))})")
        a("  " + " | ".join(parts))

    # International ETFs
    intl_etfs = payload.get("international_etfs") or []
    if intl_etfs:
        a("\n## INTERNATIONAL ETFs")
        parts = []
        for r in intl_etfs:
            tk = r.get("ticker") or r.get("index", "")
            parts.append(f"{tk} ${_val(r.get('last'))} (1d {_pct(r.get('ret_1d'))} 1m {_pct(r.get('ret_1m'))})")
        a("  " + " | ".join(parts))

    # Energy
    energy = payload.get("energy_eia") or payload.get("energy") or {}
    if energy:
        a("\n## ENERGY (EIA)")
        for k, v in list(energy.items())[:6]:
            if isinstance(v, dict):
                a(f"  {k}: {v.get('latest_value')} {v.get('units','')} (as of {str(v.get('as_of',''))[:10]})")

    # News
    news = payload.get("news_by_sector") or payload.get("news") or {}
    if news:
        a("\n## NEWS BY SECTOR")
        for sector, items in news.items():
            for h in items[:2]:
                title = h.get("title", "")
                src = h.get("source", "")
                a(f"  [{sector}] {title}" + (f" ({src})" if src else ""))

    # Options flow
    options = payload.get("options_flow") or payload.get("options") or []
    if options:
        a("\n## OPTIONS FLOW & IV")
        for o in options[:8]:
            tk = o.get("ticker") or o.get("tk", "")
            pc = o.get("put_call_vol_ratio") or o.get("pc")
            sig = o.get("signal") or o.get("sig", "")
            ivr = o.get("iv_rank")
            atm_iv = o.get("atm_iv_pct")
            skew = o.get("iv_skew_pct")
            greeks = o.get("greeks") or {}
            strat = (o.get("recommended_strategy") or {}).get("strategy", "")

            parts = [f"{tk}: P/C {_val(pc, 2)}, signal={sig}"]
            if atm_iv is not None:
                parts.append(f"ATM IV={atm_iv:.1f}%")
            if ivr is not None:
                parts.append(f"IVR={ivr:.0f}")
            if skew is not None:
                parts.append(f"skew={skew:+.1f}%")
            if greeks.get("delta"):
                parts.append(f"delta={greeks['delta']:.2f} theta={greeks.get('theta', 0):.3f}")
            if strat:
                parts.append(f"strategy={strat}")
            a("  " + ", ".join(parts))

    # Insider trades
    insider = payload.get("insider_trades") or payload.get("insider") or []
    if insider:
        a("\n## INSIDER ACTIVITY (Form 4, last 14d)")
        seen: set = set()
        for i in insider[:8]:
            tk = i.get("ticker") or i.get("tk", "")
            if tk in seen:
                continue
            seen.add(tk)
            entity = i.get("entity", "")[:35]
            a(f"  {tk}: {entity} filed {i.get('filed','')}")

    # Earnings
    earnings = payload.get("earnings_calendar") or payload.get("earnings") or []
    if earnings:
        a("\n## UPCOMING EARNINGS")
        for e in earnings:
            a(f"  {e.get('ticker')}: reports {e.get('earnings_date')}")

    # Reddit
    reddit = payload.get("retail_sentiment_reddit") or payload.get("reddit") or []
    if reddit:
        a("\n## RETAIL SENTIMENT (Reddit top posts)")
        for p in reddit[:5]:
            a(f"  [{p.get('sub')}] {p.get('title','')[:80]}")

    # Macro events calendar
    macro_events = payload.get("macro_events") or []
    if macro_events:
        a("\n## UPCOMING MACRO EVENTS (next 21 days)")
        for e in macro_events:
            a(f"  {e['date']} ({e['days_away']}d) [{e['importance'].upper()}] {e['event']}")

    # Short interest
    short_interest = payload.get("short_interest") or []
    if short_interest:
        a("\n## SHORT INTEREST (top by % float)")
        for s in short_interest[:8]:
            mom = f", MoM {s['mom_change_pct']:+.1f}%" if s.get("mom_change_pct") is not None else ""
            a(f"  {s['ticker']}: {s['short_pct_float']}% float shorted, {s.get('days_to_cover','?')}d cover, signal={s['signal']}{mom}")

    # Satellite fires
    fires = payload.get("satellite_fires") or []
    active_fires = [f for f in fires if f.get("signal") not in ("clear", None)]
    if active_fires:
        a("\n## SATELLITE FIRE ALERTS (NASA FIRMS)")
        for f in active_fires:
            crops = ", ".join(f.get("affected_crops") or [])
            tickers = ", ".join(f.get("related_tickers") or [])
            a(f"  {f.get('region')}: {f.get('fire_count')} fires [{f.get('signal').upper()}]"
              + (f" — crops: {crops}" if crops else "")
              + (f" — watch: {tickers}" if tickers else ""))

    # Crop weather stress
    crop_wx = payload.get("crop_weather") or []
    stressed = [c for c in crop_wx if c.get("signal") not in ("normal", "off_season", None)]
    if stressed:
        a("\n## CROP WEATHER STRESS (NASA POWER)")
        for c in stressed:
            crops = ", ".join(c.get("crops") or [])
            a(f"  {c.get('region')} [{c.get('signal').upper()}]: "
              f"temp={c.get('avg_temp_c')}°C, precip={c.get('precip_30d_mm')}mm/30d"
              + (f" ({crops})" if crops else ""))

    # Flight activity
    flights = payload.get("flight_activity") or []
    disrupted = [f for f in flights if f.get("signal") not in ("normal", None)]
    if disrupted:
        a("\n## FLIGHT ACTIVITY (OpenSky)")
        for f in disrupted:
            a(f"  {f.get('region')}: {f.get('flight_count')} flights "
              f"({f.get('ratio_vs_baseline', 1.0):.1f}x baseline) [{f.get('signal').upper()}]")

    # Events
    events = payload.get("global_events") or payload.get("events") or {}
    quakes = events.get("earthquakes", [])
    alerts = events.get("weather_alerts", [])
    if quakes or alerts:
        a("\n## GLOBAL EVENTS")
        for q in quakes[:4]:
            a(f"  Earthquake M{q.get('magnitude')} — {q.get('place')} ({str(q.get('time_utc',''))[:10]})")
        for w in alerts[:4]:
            a(f"  Weather alert: {w.get('event','?')} — {w.get('area','?')}")

    return "\n".join(lines)
