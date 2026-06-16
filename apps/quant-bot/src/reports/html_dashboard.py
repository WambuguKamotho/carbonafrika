"""Render the brief into a single-file HTML dashboard."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from jinja2 import Template

from src.analysis.schemas import TradeBrief

HTML_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AI Quant Bot — {{ brief.as_of }}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<style>
  :root { --bg:#0e1116; --card:#171b22; --muted:#8b95a7; --fg:#e6e9ef;
          --pos:#28c76f; --neg:#ea5455; --neu:#ffb547;
          --over:#28c76f; --under:#ea5455; --neutral:#8b95a7;
          --border:#262c38; }
  * { box-sizing: border-box; }
  html, body { overflow-x: hidden; max-width: 100vw; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Inter, system-ui, sans-serif;
         line-height: 1.55; }
  header { padding: 16px 20px 12px; border-bottom: 1px solid var(--border);
           display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; }
  h1 { margin:0; font-size: 20px; }
  .sub { color: var(--muted); font-size: 12px; margin-top: 3px; }
  main { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; padding: 16px 20px; }
  @media (max-width: 1100px) { main { grid-template-columns: 1fr; } }
  @media (max-width: 700px)  { main { padding: 10px 12px; gap: 10px; } }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px;
          padding: 18px 20px; margin-bottom: 18px; }
  .card h2 { margin: 0 0 12px; font-size: 13px; letter-spacing: .06em;
             text-transform: uppercase; color: var(--muted); font-weight:600; }
  .stance-overweight { color: var(--over); font-weight: 600; }
  .stance-underweight { color: var(--under); font-weight: 600; }
  .stance-neutral { color: var(--neutral); font-weight: 600; }
  .conv { display:inline-block; padding: 1px 8px; border-radius: 999px;
          font-size: 11px; margin-left: 6px; border: 1px solid var(--border); }
  .conv-high { background: rgba(40,199,111,.15); color: var(--pos); border-color: var(--pos); }
  .conv-medium { background: rgba(255,181,71,.15); color: var(--neu); border-color: var(--neu); }
  .conv-low { background: rgba(139,149,167,.15); color: var(--muted); }
  .dir-long { color: var(--pos); font-weight: 600; }
  .dir-short { color: var(--neg); font-weight: 600; }
  .sev-high { color: var(--neg); font-weight: 600; }
  .sev-medium { color: var(--neu); font-weight: 600; }
  .sev-low { color: var(--muted); }
  .pnl-pos { color: var(--pos); font-weight: 600; }
  .pnl-neg { color: var(--neg); font-weight: 600; }
  .status-target_hit { color: var(--pos); }
  .status-stopped_out { color: var(--neg); }
  .status-open { color: var(--neu); }
  .status-win { color:var(--pos); }
  .status-loss { color:var(--neg); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 500; font-size: 12px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .idea { padding: 10px 0; border-top: 1px dashed var(--border); }
  .idea:first-child { border-top: none; padding-top: 0; }
  .idea .meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .pill { background: rgba(255,255,255,.05); padding: 1px 7px;
          border-radius: 4px; margin-right: 5px; font-size: 12px; display:inline-block; }
  .pill-pos { background: rgba(40,199,111,.1); color: var(--pos); }
  .pill-neg { background: rgba(234,84,85,.1); color: var(--neg); }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
  .stat-box { background: rgba(255,255,255,.03); border-radius: 8px; padding: 12px 10px; text-align: center; }
  .stat-box .val { font-size: 24px; font-weight: 700; }
  .stat-box .lbl { font-size: 11px; color: var(--muted); margin-top: 3px; }
  .footer { padding: 12px 20px 28px; color: var(--muted); font-size: 12px; border-top:1px solid var(--border); }
  .sizing-badge { font-size: 11px; background: rgba(255,181,71,.12); color: var(--neu);
                  border: 1px solid rgba(255,181,71,.3); border-radius: 4px;
                  padding: 1px 6px; margin-left: 6px; }
  /* Win rate gauge */
  .gauge-wrap { display:flex; align-items:center; gap:20px; margin: 8px 0 14px; }
  .gauge { position:relative; width:110px; height:58px; overflow:hidden; }
  .gauge-bg { width:110px; height:110px; border-radius:50%;
              background: conic-gradient(var(--neg) 0deg 180deg, transparent 180deg);
              position:absolute; top:0; }
  .gauge-fill { width:110px; height:110px; border-radius:50%; position:absolute; top:0;
                transform-origin: 50% 50%; transition: transform 0.8s cubic-bezier(.4,0,.2,1); }
  .gauge-center { position:absolute; bottom:0; left:50%; transform:translateX(-50%);
                  width:64px; height:32px; background:var(--card); border-radius:32px 32px 0 0; }
  .gauge-val { font-size:28px; font-weight:800; line-height:1; }
  .gauge-lbl { font-size:11px; color:var(--muted); margin-top:2px; }
  .bar-track { background:rgba(255,255,255,.07); border-radius:4px; height:6px; margin:3px 0 8px; }
  .bar-fill { height:6px; border-radius:4px; transition: width 0.6s ease; }
  .chart-wrap { position:relative; width:100%; overflow:hidden; }
  canvas { max-width:100%; display:block; }
  /* Expandable trades drawer */
  .expand-btn { display:inline-flex; align-items:center; gap:5px; margin-top:10px;
                font-size:11px; color:var(--muted); cursor:pointer; border:none;
                background:rgba(255,255,255,.04); border-radius:4px;
                padding:3px 10px; font-family:inherit; transition:background 0.15s; }
  .expand-btn:hover { background:rgba(255,255,255,.09); color:var(--fg); }
  .expand-btn .arrow { display:inline-block; transition:transform 0.2s; }
  .expand-btn.open .arrow { transform:rotate(180deg); }
  .trades-drawer { display:none; margin-top:12px; border-top:1px solid var(--border); padding-top:10px; }
  .trades-drawer.open { display:block; }
  .risk-item { padding:8px 0; border-top:1px dashed var(--border); }
  .risk-item:first-child { border-top:none; padding-top:0; }
  .badge { display:inline-block; padding:1px 7px; border-radius:4px; font-size:11px;
           font-weight:600; margin-right:6px; }
  .badge-high { background:rgba(234,84,85,.18); color:var(--neg); }
  .badge-medium { background:rgba(255,181,71,.18); color:var(--neu); }
  .badge-low { background:rgba(139,149,167,.15); color:var(--muted); }
  .hdr-stat { text-align:right; }
  .hdr-stat .big { font-size:28px; font-weight:800; }
  .hdr-stat .sm { font-size:12px; color:var(--muted); }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  @media (max-width: 700px) { .two-col { grid-template-columns:1fr; } }
  /* ? hint button */
  .card { position:relative; }
  .hint-btn { position:absolute; top:14px; right:14px; width:18px; height:18px;
              border-radius:50%; border:1px solid var(--border); background:rgba(255,255,255,.05);
              color:var(--muted); font-size:11px; font-weight:700; line-height:18px;
              text-align:center; cursor:pointer; font-family:inherit;
              transition:background 0.15s, color 0.15s; user-select:none; flex-shrink:0; }
  .hint-btn:hover, .hint-btn.active { background:rgba(139,149,167,.25); color:var(--fg); border-color:var(--muted); }
  /* tooltip bubble anchored to the ? */
  .hint-bubble { position:absolute; top:36px; right:0; z-index:200; width:260px;
                 background:#1e2330; border:1px solid #3a4255; border-radius:8px;
                 padding:10px 13px; font-size:12px; line-height:1.6; color:#c9d0dc;
                 box-shadow:0 8px 32px rgba(0,0,0,.55);
                 opacity:0; pointer-events:none;
                 transition:opacity 0.18s ease; }
  .hint-bubble.open { opacity:1; pointer-events:auto; }
  /* Activity feed */
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .act-live { background:var(--pos)!important; animation:pulse 1.4s ease-in-out infinite; }
  #actLog { max-height:220px; overflow-y:auto; overflow-x:hidden;
            display:flex; flex-direction:column; gap:3px; }
  .act-row { display:flex; align-items:baseline; gap:6px; font-size:11px;
             font-family:monospace; padding:2px 0; border-bottom:1px solid rgba(255,255,255,.03);
             min-width:0; }
  .act-row:last-child { border-bottom:none; }
  .act-ts   { color:#4a5568; flex-shrink:0; }
  .act-tag  { flex-shrink:0; font-size:10px; padding:0 5px; border-radius:3px;
              font-weight:600; letter-spacing:.03em; text-transform:uppercase; }
  .act-msg  { color:var(--fg); opacity:.85; word-break:break-word; min-width:0; }
  .act-info     .act-tag { background:rgba(139,149,167,.15); color:#8b95a7; }
  .act-success  .act-tag { background:rgba(40,199,111,.15);  color:#28c76f; }
  .act-warning  .act-tag { background:rgba(255,181,71,.15);  color:#ffb547; }
  .act-error    .act-tag { background:rgba(234,84,85,.15);   color:#ea5455; }
  .act-decision .act-tag { background:rgba(167,139,250,.15); color:#a78bfa; }
  .act-decision .act-msg  { color:#c4b5fd; }
  /* Sidebar compact collapsible cards */
  aside .card { padding: 11px 13px; margin-bottom: 8px; }
  aside .card h2 { margin: 0; display:flex; align-items:center; gap:4px; cursor:pointer;
                   padding-right: 26px; }
  aside .card h2 .chev-btn { background:none; border:none; color:var(--muted); cursor:pointer;
              font-size:13px; padding:0; margin-left:auto; transition:transform 0.2s;
              font-family:inherit; line-height:1; flex-shrink:0; }
  aside .card h2 .chev-btn:hover { color:var(--fg); }
  .card-body { margin-top: 10px; }
  .card-body.collapsed { display: none; }
  /* News ticker */
  .ticker-wrap { display:flex; align-items:center; overflow:hidden;
                 background:var(--card); border-bottom:1px solid var(--border);
                 height:34px; width:100%; }
  .ticker-label { padding:0 14px; font-size:10px; font-weight:800; letter-spacing:.1em;
                  color:#ff6b35; flex-shrink:0; border-right:1px solid var(--border);
                  height:100%; display:flex; align-items:center;
                  background:rgba(255,107,53,.07); white-space:nowrap; }
  .ticker-track { overflow:hidden; flex:1; height:100%; position:relative; }
  .ticker-inner { display:flex; align-items:center; height:100%; white-space:nowrap;
                  will-change:transform; }
  @keyframes ticker-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  .ticker-item { display:inline-flex; align-items:center; gap:6px; padding:0 28px 0 0;
                 font-size:12px; color:var(--fg); }
  .ticker-src { font-size:10px; font-weight:700; padding:1px 5px; border-radius:3px;
                flex-shrink:0; }
  .ticker-src-Reuters { background:rgba(255,170,51,.12); color:#ffaa33; }
  .ticker-src-CNBC    { background:rgba(40,199,111,.10); color:#28c76f; }
  .ticker-src-AP      { background:rgba(139,149,167,.12); color:#8b95a7; }
  .ticker-sep { color:var(--border); padding:0 4px; }
  /* Mini return charts inside cards */
  .mini-chart-wrap { position:relative; height:64px; margin-top:8px; }
  .mini-chart-wrap canvas { max-width:100%; }
  .mini-chart-tk { font-size:10px; color:var(--muted); text-align:right; margin-top:2px; }
</style>
</head>
<body>

{%- macro hint(text) %}
<button class="hint-btn" onclick="toggleHint(this)" title="What is this?">?</button>
<div class="hint-bubble">{{ text }}</div>
{%- endmacro %}

<header>
  <div>
    <h1>&#9680; AI Quant Bot</h1>
    <div class="sub">{{ brief.as_of }} (UTC) &nbsp;·&nbsp; Not financial advice</div>
  </div>
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
    <input id="searchBar" type="text" placeholder="&#128269; Search ticker / keyword…"
      oninput="filterCards(this.value)"
      style="background:var(--card);border:1px solid var(--border);color:var(--fg);
             border-radius:6px;padding:6px 10px;font-size:12px;width:190px;outline:none;">
    <button id="runNowBtn" onclick="triggerRun()"
      style="background:#2563eb;color:#fff;border:none;border-radius:6px;
             padding:7px 14px;font-size:12px;cursor:pointer;font-weight:600;">
      &#9654; Run Now
    </button>
    <div id="priceAlert" style="display:none;font-size:11px;color:var(--pos);
         max-width:220px;word-break:break-word;"></div>
  </div>
  <div class="hdr-stat">
    {% set ps = snapshot.paper_stats %}
    {% if ps and ps.total_trades > 0 %}
    <div class="big {% if ps.win_rate_pct >= 50 %}pnl-pos{% else %}pnl-neg{% endif %}">
      {{ ps.win_rate_pct }}%
    </div>
    <div class="sm">win rate &nbsp;·&nbsp; {{ ps.total_trades }} trades scored</div>
    {% else %}
    <div class="big" style="color:var(--muted);">—</div>
    <div class="sm">building history…</div>
    {% endif %}
  </div>
</header>

<!-- Live price sparkline strip -->
<div id="liveSparkStrip" style="display:none;background:var(--card);border-bottom:1px solid var(--border);
     padding:6px 20px;display:flex;gap:20px;overflow-x:auto;align-items:center;">
  <span style="font-size:10px;color:var(--muted);white-space:nowrap;">LIVE PRICES</span>
  <span id="liveSparkItems" style="display:flex;gap:16px;align-items:center;flex-wrap:nowrap;"></span>
</div>

{% if snapshot.reuters_headlines %}
<div class="ticker-wrap">
  <div class="ticker-label">&#9632; MARKET HEADLINES</div>
  <div class="ticker-track">
    <div class="ticker-inner" id="tickerInner">
      {%- set items = snapshot.reuters_headlines -%}
      {%- for _ in range(2) -%}
        {%- for h in items -%}
        <span class="ticker-item">
          <span class="ticker-src ticker-src-{{ h.source }}">{{ h.source }}</span>
          {{ h.title }}
        </span><span class="ticker-sep">◆</span>
        {%- endfor -%}
      {%- endfor -%}
    </div>
  </div>
</div>
{% endif %}

<main>
  <section>

    <!-- ── Paper Trading ─────────────────────────────────────── -->
    {% set ps = snapshot.paper_stats %}
    {% if ps %}
    <div class="card">{% set _h="Rule-based signals (VIX term structure, sector momentum, put/call ratio, yield curve) are paper-traded with a 5-day hold. Win rate and P&L update automatically as trades close. Green = above 50% win rate." %}{{ hint(_h) }}
      <h2>Paper Trading — Systematic Signals</h2>
      {% set wr = ps.win_rate_pct | default(0) %}
      {% set gauge_color = '#28c76f' if wr >= 55 else '#ffb547' if wr >= 45 else '#ea5455' %}
      {% set gauge_deg = (wr / 100 * 180) | int %}
      <div class="gauge-wrap">
        <div>
          <div class="gauge">
            <div class="gauge-bg"></div>
            <div class="gauge-fill"
                 style="background:{{ gauge_color }};
                        clip-path:polygon(0 0,100% 0,100% 100%,0 100%);
                        transform:rotate({{ gauge_deg }}deg) scaleX(-1) rotate(180deg);">
            </div>
            <div class="gauge-center"></div>
          </div>
        </div>
        <div>
          <div class="gauge-val {% if wr >= 50 %}pnl-pos{% else %}pnl-neg{% endif %}">{{ wr }}%</div>
          <div class="gauge-lbl">Win Rate ({{ ps.wins|default(0) }}W / {{ ps.losses|default(0) }}L)</div>
          <div style="font-size:12px;margin-top:6px;">
            Avg P&amp;L:
            <span class="{% if ps.avg_pnl_pct >= 0 %}pnl-pos{% else %}pnl-neg{% endif %}">
              {% if ps.avg_pnl_pct >= 0 %}+{% endif %}{{ ps.avg_pnl_pct }}%
            </span>
            &nbsp;·&nbsp;
            <span style="color:var(--neu);">{{ ps.open_trades|default(0) }} open</span>
            &nbsp;·&nbsp;
            <span style="color:var(--muted);">+{{ ps.new_signals_today|default(0) }} today</span>
          </div>
        </div>
      </div>

      {% if ps.equity_curve and ps.equity_curve | length > 1 %}
      <div class="chart-wrap" style="height:120px;margin-bottom:12px;">
        <canvas id="equityChart"></canvas>
      </div>
      {% endif %}

      {% if ps.by_signal %}
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px;">Signal breakdown</div>
      {% for sn, st in ps.by_signal.items() %}
      <div style="margin-bottom:7px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;">
          <span>{{ sn | replace('_',' ') }}</span>
          <span class="{% if st.win_rate >= 50 %}pnl-pos{% else %}pnl-neg{% endif %}">
            {{ st.win_rate }}% &nbsp;<span style="color:var(--muted);">(n={{ st.n }})</span>
          </span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:{{ st.win_rate }}%;background:{% if st.win_rate >= 55 %}var(--pos){% elif st.win_rate >= 45 %}var(--neu){% else %}var(--neg){% endif %};"></div>
        </div>
      </div>
      {% endfor %}
      {% endif %}

      {% if ps.recent_trades %}
      <div style="margin-top:14px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px;">Recent trades</div>
        <table>
          <tr><th>Signal</th><th>Ticker</th><th>Dir</th><th class="num">Entry</th><th class="num">P&amp;L</th><th>Result</th></tr>
          {% for t in ps.recent_trades %}
          <tr>
            <td style="font-size:11px;">{{ t.signal_name|replace('_',' ') }}</td>
            <td><strong>{{ t.ticker }}</strong></td>
            <td class="dir-{{ t.direction }}">{{ t.direction|upper }}</td>
            <td class="num">{{ t.entry_price }}</td>
            <td class="num {% if (t.pnl_pct or 0) >= 0 %}pnl-pos{% else %}pnl-neg{% endif %}">
              {% if t.pnl_pct is not none %}{% if t.pnl_pct >= 0 %}+{% endif %}{{ t.pnl_pct }}%{% else %}—{% endif %}
            </td>
            <td class="status-{{ t.status }}">{{ t.status }}</td>
          </tr>
          {% endfor %}
        </table>
      </div>
      {% endif %}

      {% if snapshot.open_trades %}
      <button class="expand-btn" id="openTradesBtn" onclick="toggleDrawer(this,'openTradesDrawer')">
        <span class="arrow">&#9660;</span>
        <span class="drawer-label">Show {{ snapshot.open_trades | length }} open positions</span>
      </button>
      <div class="trades-drawer" id="openTradesDrawer">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px;">All open paper trades</div>
        <table>
          <tr>
            <th>Signal</th><th>Ticker</th><th>Dir</th>
            <th class="num">Entry $</th><th>Entry Date</th><th>Days</th>
            <th class="num" title="GBM simulated win probability">GBM Win%</th>
          </tr>
          {% for t in snapshot.open_trades %}
          <tr>
            <td style="font-size:11px;">{{ t.signal_name|replace('_',' ') }}</td>
            <td><strong>{{ t.ticker }}</strong></td>
            <td class="dir-{{ t.direction }}">{{ t.direction|upper }}</td>
            <td class="num">{{ t.entry_price or '—' }}</td>
            <td style="font-size:11px;color:var(--muted);">{{ t.entry_date[:10] if t.entry_date else '—' }}</td>
            <td class="num" style="color:var(--muted);">{{ t.hold_days or '—' }}</td>
            <td class="num">
              {% set pwin_raw = t.gbm_p_target | default(none) %}
              {% if pwin_raw is not none %}
              {% set pwin = (pwin_raw * 100) | round | int %}
              <span style="color:{% if pwin >= 60 %}var(--pos){% elif pwin < 45 %}var(--neg){% else %}var(--neu){% endif %};font-weight:600;">{{ pwin }}%</span>
              {% else %}—{% endif %}
            </td>
          </tr>
          {% endfor %}
        </table>
      </div>
      {% endif %}
    </div>
    {% endif %}

    <!-- ── LLM Track Record ───────────────────────────────────── -->
    {% if snapshot.performance and snapshot.performance.total_ideas_scored > 0 %}
    {% set p = snapshot.performance %}
    <div class="card">{% set _h="Scores the AI's own trade ideas 5 days after each call — entry price at publication vs current price. The AI reads this history before each run and self-corrects: if high-conviction calls underperform, it recalibrates." %}{{ hint(_h) }}
      <h2>LLM Track Record</h2>
      <div class="stat-grid">
        <div class="stat-box">
          <div class="val {% if p.win_rate_pct >= 50 %}pnl-pos{% else %}pnl-neg{% endif %}">{{ p.win_rate_pct }}%</div>
          <div class="lbl">Win Rate</div>
        </div>
        <div class="stat-box">
          <div class="val {% if p.avg_pnl_pct >= 0 %}pnl-pos{% else %}pnl-neg{% endif %}">
            {% if p.avg_pnl_pct >= 0 %}+{% endif %}{{ p.avg_pnl_pct }}%
          </div>
          <div class="lbl">Avg P&amp;L</div>
        </div>
        <div class="stat-box">
          <div class="val">{{ p.total_ideas_scored }}</div>
          <div class="lbl">Scored</div>
        </div>
      </div>
      {% if p.by_conviction %}
      <table>
        <tr><th>Conviction</th><th class="num">n</th><th class="num">Avg P&amp;L</th></tr>
        {% for k, v in p.by_conviction.items() %}
        <tr>
          <td><span class="conv conv-{{ k }}">{{ k }}</span></td>
          <td class="num">{{ v.n }}</td>
          <td class="num {% if v.avg_pnl >= 0 %}pnl-pos{% else %}pnl-neg{% endif %}">
            {% if v.avg_pnl >= 0 %}+{% endif %}{{ v.avg_pnl }}%
          </td>
        </tr>
        {% endfor %}
      </table>
      {% endif %}
    </div>
    {% endif %}

    <!-- ── Macro Summary ──────────────────────────────────────── -->
    <div class="card">{% set _h="The AI's synthesis of the current macro environment — Fed policy, growth, inflation, credit conditions, and global risks — in 4-6 sentences. This sets the directional bias for all sector calls below." %}{{ hint(_h) }}
      <h2>Macro Summary</h2>
      <p id="macroTech" style="line-height:1.7;margin:0;">{{ brief.macro_summary }}</p>
      {% if brief.macro_summary_simple %}
      <p id="macroSimple" style="line-height:1.7;margin:0;display:none;">{{ brief.macro_summary_simple }}</p>
      <div style="text-align:right;margin-top:10px;">
        <button id="macroToggle" onclick="toggleMacro()"
          style="font-size:11px;padding:3px 12px;border-radius:20px;border:1px solid var(--border);
                 background:rgba(255,255,255,.05);color:var(--muted);cursor:pointer;
                 font-family:inherit;transition:all 0.2s;">
          Plain English
        </button>
      </div>
      {% endif %}
    </div>

    <!-- ── Sector Calls ───────────────────────────────────────── -->
    <div class="card">{% set _h="Overweight = allocate more than benchmark. Underweight = reduce exposure. Driven by momentum, macro data, news flow, and options activity. Click a sector to expand its rationale." %}{{ hint(_h) }}
      <h2>Sector Calls</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:8px;margin-bottom:4px;">
      {% for sc in brief.sector_calls %}
      {% set sc_id = "sc_" ~ loop.index %}
      <div onclick="toggleSC('{{ sc_id }}')" style="cursor:pointer;border-radius:8px;padding:10px 12px;border:1px solid var(--border);background:
        {% if sc.stance=='overweight' %}rgba(40,199,111,.08){% elif sc.stance=='underweight' %}rgba(234,84,85,.08){% else %}rgba(255,255,255,.03){% endif %};
        border-left:3px solid
        {% if sc.stance=='overweight' %}var(--pos){% elif sc.stance=='underweight' %}var(--neg){% else %}var(--muted){% endif %};">
        <div style="font-size:12px;font-weight:700;">{{ sc.sector }}</div>
        <div class="stance-{{ sc.stance }}" style="font-size:11px;margin-top:2px;">{{ sc.stance|upper }}</div>
      </div>
      {% endfor %}
      </div>
      {% for sc in brief.sector_calls %}
      {% set sc_id = "sc_" ~ loop.index %}
      <div id="{{ sc_id }}" style="display:none;margin-top:6px;padding:10px 12px;border-radius:6px;background:rgba(255,255,255,.03);border:1px solid var(--border);">
        <div style="font-size:12px;font-weight:600;">{{ sc.sector }} — <span class="stance-{{ sc.stance }}">{{ sc.stance|upper }}</span></div>
        <div class="meta" style="margin-top:4px;">{{ sc.rationale }}</div>
        {% if sc.key_drivers %}
        <div class="meta" style="margin-top:5px;">{% for d in sc.key_drivers %}<span class="pill">{{ d }}</span>{% endfor %}</div>
        {% endif %}
        {% if sc.risks %}
        <div class="meta" style="margin-top:3px;color:rgba(234,84,85,.8);">{% for r in sc.risks %}<span class="pill">&#9888; {{ r }}</span>{% endfor %}</div>
        {% endif %}
        {% set etf_tk = snapshot.sector_etfs_map.get(sc.sector, '') %}
        {% if etf_tk %}{% set tr = snapshot.ticker_returns.get(etf_tk, {}) %}{% if tr %}
        <div class="mini-chart-wrap">
          <canvas data-mini
            data-r1d="{{ tr.ret_1d | default(0) | round(2) }}"
            data-r1w="{{ tr.ret_1w | default(0) | round(2) }}"
            data-r1m="{{ tr.ret_1m | default(0) | round(2) }}"
            data-r3m="{{ tr.ret_3m | default(0) | round(2) }}"></canvas>
        </div>
        <div class="mini-chart-tk">{{ etf_tk }}</div>
        {% endif %}{% endif %}
      </div>
      {% endfor %}
    </div>

    <!-- ── Ideas ─────────────────────────────────────────────── -->
    <div class="two-col">
      <div class="card">{% set _h="Tactical trades for the next 1-4 weeks. Entry zone is a price range to enter; stop is where the thesis is wrong; target is the expected exit. Conviction (low/medium/high) reflects data quality and signal strength." %}{{ hint(_h) }}
        <h2>Short-Term Ideas (1d–4w)</h2>
        {% for i in brief.short_term_ideas %}
        <div class="idea">
          <div>
            <strong>{{ i.ticker }}</strong>
            <span class="dir-{{ i.direction }}">{{ i.direction|upper }}</span>
            <span class="conv conv-{{ i.conviction }}">{{ i.conviction }}</span>
          </div>
          <div class="meta">{{ i.thesis }}</div>
          <div class="meta" style="margin-top:4px;">
            {% if i.entry_zone %}<span class="pill">&#8594; {{ i.entry_zone }}</span>{% endif %}
            {% if i.stop_loss %}<span class="pill pill-neg">&#128683; {{ i.stop_loss }}</span>{% endif %}
            {% if i.target %}<span class="pill pill-pos">&#127919; {{ i.target }}</span>{% endif %}
          </div>
          {% set tr = snapshot.ticker_returns.get(i.ticker, {}) %}{% if tr %}
          <div class="mini-chart-wrap">
            <canvas data-mini
              data-r1d="{{ tr.ret_1d | default(0) | round(2) }}"
              data-r1w="{{ tr.ret_1w | default(0) | round(2) }}"
              data-r1m="{{ tr.ret_1m | default(0) | round(2) }}"
              data-r3m="{{ tr.ret_3m | default(0) | round(2) }}"></canvas>
          </div>
          {% endif %}
        </div>
        {% endfor %}
      </div>

      <div class="card">{% set _h="Structural positions for 6 months or longer — driven by macro themes, valuation, or secular trends. Wider entry zones and stops reflect the longer horizon. Less sensitive to daily noise." %}{{ hint(_h) }}
        <h2>Long-Term Ideas (6m+)</h2>
        {% for i in brief.long_term_ideas %}
        <div class="idea">
          <div>
            <strong>{{ i.ticker }}</strong>
            <span class="dir-{{ i.direction }}">{{ i.direction|upper }}</span>
            <span class="conv conv-{{ i.conviction }}">{{ i.conviction }}</span>
          </div>
          <div class="meta">{{ i.thesis }}</div>
          <div class="meta" style="margin-top:4px;">
            {% if i.entry_zone %}<span class="pill">&#8594; {{ i.entry_zone }}</span>{% endif %}
            {% if i.stop_loss %}<span class="pill pill-neg">&#128683; {{ i.stop_loss }}</span>{% endif %}
            {% if i.target %}<span class="pill pill-pos">&#127919; {{ i.target }}</span>{% endif %}
          </div>
          {% set tr = snapshot.ticker_returns.get(i.ticker, {}) %}{% if tr %}
          <div class="mini-chart-wrap">
            <canvas data-mini
              data-r1d="{{ tr.ret_1d | default(0) | round(2) }}"
              data-r1w="{{ tr.ret_1w | default(0) | round(2) }}"
              data-r1m="{{ tr.ret_1m | default(0) | round(2) }}"
              data-r3m="{{ tr.ret_3m | default(0) | round(2) }}"></canvas>
          </div>
          {% endif %}
        </div>
        {% endfor %}
      </div>
    </div>

    <!-- ── Live Activity Window ──────────────────────────────── -->
    <div class="card" style="margin-top:0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span id="actDot" style="width:8px;height:8px;border-radius:50%;background:var(--muted);display:inline-block;flex-shrink:0;transition:background .3s;"></span>
        <h2 style="margin:0;">Bot Activity</h2>
        <span id="actStatus" style="font-size:11px;color:var(--muted);margin-left:2px;font-weight:400;text-transform:none;letter-spacing:0;"></span>
        <button onclick="toggleActivity()" id="actToggleBtn"
          style="margin-left:auto;font-size:11px;color:var(--muted);background:rgba(255,255,255,.05);
                 border:1px solid var(--border);border-radius:4px;padding:2px 10px;cursor:pointer;font-family:inherit;">
          Hide
        </button>
      </div>
      <div id="actLog">
        <div class="act-row act-info"><span class="act-ts">--:--:--</span><span class="act-tag">info</span><span class="act-msg">Waiting for activity...</span></div>
      </div>
    </div>

  </section>

  <!-- ── SIDEBAR ────────────────────────────────────────────── -->
  <aside>

    <!-- Macro Events (compact, merged into sidebar top) -->
    {% if snapshot.macro_events %}
    <div class="card">{{ hint('Scheduled market-moving events in the next 21 days. RED = high impact, expect sharp moves. Avoid unhedged entries the day before a high-importance release.') }}
      <h2>Upcoming Events <button class="chev-btn" onclick="toggleCard(this,'cb_macroevt')" aria-label="collapse">▾</button></h2>
      <div class="card-body" id="cb_macroevt">
      <table>
        <tr><th>Date</th><th>Event</th><th>In</th></tr>
        {% for e in snapshot.macro_events %}
        <tr>
          <td style="font-size:12px;white-space:nowrap;">{{ e.date }}</td>
          <td style="font-size:12px;">
            <span class="{% if e.importance == 'high' %}pnl-neg{% else %}pnl-pos{% endif %}" style="font-weight:600;">
              {{ '🔴' if e.importance == 'high' else '🟡' }}
            </span>
            {{ e.event }}
          </td>
          <td class="num" style="font-size:12px;color:var(--muted);">{{ e.days_away }}d</td>
        </tr>
        {% endfor %}
      </table>
      </div>
    </div>
    {% endif %}

    <!-- Sector Rotation -->
    {% if snapshot.sector_rotation %}
    <div class="card">{% set _h="SPDR sector ETFs ranked by 1-month price momentum. Green bars = outperforming. Red = underperforming. Money rotates from weak sectors into strong ones — leaders often stay in front for weeks." %}{{ hint(_h) }}
      <h2>Sector Rotation — 1m <button class="chev-btn" onclick="toggleCard(this,'cb_sector')" aria-label="collapse">▾</button></h2>
      <div class="card-body" id="cb_sector">
      <div class="chart-wrap" style="height:170px;"><canvas id="sectorChart"></canvas></div>
      </div>
    </div>
    {% endif %}

    <!-- FX & Commodities -->
    {% if snapshot.fx %}
    <div class="card">{% set _h="Daily moves in currencies and commodities. A rising DXY pressures gold and emerging markets. Rising oil benefits energy stocks. Gold rising = risk-off or inflation hedge. Copper is a global growth barometer." %}{{ hint(_h) }}
      <h2>FX &amp; Commodities — 1d <button class="chev-btn" onclick="toggleCard(this,'cb_fx')" aria-label="collapse">▾</button></h2>
      <div class="card-body" id="cb_fx">
      <div class="chart-wrap" style="height:150px;"><canvas id="fxChart"></canvas></div>
      </div>
    </div>
    {% endif %}

    <!-- Options Flow -->
    {% if snapshot.options %}
    <div class="card">{% set _h="Put/Call volume ratio per stock. Above 1.0 = bearish (more puts). Below 0.7 = bullish (more calls). Extremes often precede large moves." %}{{ hint(_h) }}
      <h2>Options Flow — P/C Ratio <button class="chev-btn" onclick="toggleCard(this,'cb_opts')" aria-label="collapse">▾</button></h2>
      <div class="card-body" id="cb_opts">
      <div class="chart-wrap"><canvas id="pcChart" height="150"></canvas></div>
      </div>
    </div>
    {% endif %}

    <!-- Market Sentiment (F&G + VIX/SKEW + Crypto merged) -->
    {% set fg = snapshot.fear_greed | default({}) %}
    {% set cb = snapshot.cboe | default({}) %}
    {% set crypto = snapshot.crypto | default({}) %}
    {% set cr = crypto.regime | default({}) %}
    {% if fg or cb %}
    <div class="card">{% set _h="Fear & Greed (0=extreme fear, 100=extreme greed). VIX: <13 complacency, >25 fear. SKEW >140 = elevated tail-risk hedging. Crypto regime shows risk appetite direction. All are contrarian — extremes signal reversals." %}{{ hint(_h) }}
      <h2>Market Sentiment <button class="chev-btn" onclick="toggleCard(this,'cb_sent')" aria-label="collapse">▾</button></h2>
      <div class="card-body" id="cb_sent">
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        {% if fg and fg.value is defined %}
        {% set fgv = fg.value | int %}
        {# Red = fear/negative, Green = greed/positive, Yellow = neutral #}
        {% set fgcol = "var(--neg)" if fgv <= 25 else ("var(--neu)" if fgv <= 40 else ("var(--pos)" if fgv <= 60 else ("var(--neu)" if fgv <= 75 else "var(--neg)"))) %}
        <div style="flex:1;min-width:110px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px;">Fear &amp; Greed</div>
          <div style="font-size:30px;font-weight:800;color:{{ fgcol }};line-height:1;">{{ fgv }}</div>
          <div style="font-size:10px;font-weight:600;color:{{ fgcol }};">{{ fg.label | default("") }}</div>
          <div style="margin-top:6px;height:5px;background:linear-gradient(to right,#dc2626,#ca8a04,#16a34a);border-radius:3px;position:relative;">
            <div style="position:absolute;top:-4px;left:calc({{ fgv }}% - 4px);width:8px;height:13px;background:var(--fg);border-radius:2px;box-shadow:0 0 4px rgba(0,0,0,.5);"></div>
          </div>
          {% if fg.history %}
          <div style="display:flex;gap:2px;margin-top:5px;align-items:flex-end;height:28px;">
            {% for h in fg.history[:7] %}{% set hv = h.value|default(50) %}
            <div title="{{ h.date }}: {{ hv }}" style="flex:1;height:{{ [((hv/100)*28)|int, 2]|max }}px;background:{% if hv<=25 %}var(--neg){% elif hv<=40 %}var(--neu){% elif hv<=60 %}var(--pos){% elif hv<=75 %}var(--neu){% else %}var(--neg){% endif %};border-radius:1px;opacity:.7;"></div>
            {% endfor %}
          </div>
          {% endif %}
        </div>
        {% endif %}
        {% if cb and cb.vix %}
        {% set vv = cb.vix|float %}
        {# VIX: high = red (fear), normal = green (calm), extreme low = yellow (complacency) #}
        {% set vvcol = "var(--neg)" if vv>=25 else ("var(--neu)" if vv>=18 else ("var(--neu)" if vv<=12 else "var(--pos)")) %}
        <div style="flex:1;min-width:110px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px;">VIX / SKEW</div>
          <div style="display:flex;gap:12px;align-items:flex-end;">
            <div>
              <div style="font-size:26px;font-weight:800;color:{{ vvcol }};line-height:1;">{{ "%.1f"|format(vv) }}</div>
              <div style="font-size:9px;color:var(--muted);">VIX</div>
            </div>
            {% if cb.skew %}
            <div>
              <div style="font-size:20px;font-weight:700;color:{% if cb.skew>=140 %}var(--neg){% elif cb.skew<=115 %}var(--pos){% else %}var(--muted){% endif %};line-height:1;">{{ "%.0f"|format(cb.skew) }}</div>
              <div style="font-size:9px;color:var(--muted);">SKEW</div>
            </div>
            {% endif %}
          </div>
          <div style="font-size:10px;font-weight:600;color:{{ vvcol }};margin-top:4px;">{{ cb.signal|default("")|replace("_"," ")|upper }}</div>
          {% if cb.term_structure is not none %}
          <div style="font-size:10px;color:var(--muted);">Term: {{ "%+.1f"|format(cb.term_structure) }} bps</div>
          {% endif %}
        </div>
        {% endif %}
        {% if cr and cr.regime %}
        {% set crcol = "var(--pos)" if cr.signal in ["risk_on","mild_risk_on","trending_bull"] else ("var(--neg)" if cr.signal in ["risk_off","mild_risk_off","trending_bear"] else "var(--muted)") %}
        <div style="flex:1;min-width:110px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px;">Crypto Regime</div>
          <div style="font-size:14px;font-weight:700;color:{{ crcol }};">{{ cr.regime|replace("_"," ")|upper }}</div>
          {% set cp = crypto.prices|default([]) %}
          {% for c in cp[:3] %}
          {% set c24 = c.chg_24h_pct|default(none) %}
          <div style="font-size:10px;margin-top:3px;">
            <strong>{{ c.symbol }}</strong>
            <span style="color:{% if c24 is not none and c24>0 %}var(--pos){% elif c24 is not none %}var(--neg){% else %}var(--muted){% endif %};">
              {% if c24 is not none %}{{ "%+.1f"|format(c24) }}%{% else %}—{% endif %}
            </span>
          </div>
          {% endfor %}
        </div>
        {% endif %}
      </div>
      </div>
    </div>
    {% endif %}

    <!-- Economic Surprise Index -->
    {% set esi = snapshot.economic_surprise | default({}) %}
    {% if esi and esi.composite_score is defined %}
    {% set esi_score = esi.composite_score | float %}
    {% set esi_color = "var(--pos)" if esi_score > 0.5 else ("var(--neg)" if esi_score < -0.5 else "var(--neu)") %}
    <div class="card">{% set _h="Economic Surprise Index: compares the most recent FRED release for each macro indicator against its own historical trend. Positive z-score = data beating trend (risk-on). Composite > +0.5 = macro tailwind. Composite < -0.5 = macro headwind." %}{{ hint(_h) }}
      <h2>Economic Surprise Index <button class="chev-btn" onclick="toggleCard(this,'cb_esi')" aria-label="expand" style="transform:rotate(-90deg)">▾</button></h2>
      <div class="card-body collapsed" id="cb_esi">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="font-size:28px;font-weight:700;color:{{ esi_color }};">{{ "%+.2f"|format(esi_score) }}</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:{{ esi_color }};">{{ esi.regime | default("neutral") | upper }}</div>
          <div style="font-size:11px;color:var(--muted);">{{ esi.signal | default("neutral") | replace("_"," ") }}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">{{ esi.rationale | default("") }}</div>
      {% if esi.by_indicator %}
      <table style="width:100%;font-size:11px;">
        <tr><th style="text-align:left;">Indicator</th><th class="num">Latest</th><th class="num">Z-Score</th><th style="text-align:left;">Direction</th></tr>
        {% for name, ind in esi.by_indicator.items() %}
        {% set iz = ind.z_score | default(none) %}
        {% set idir = ind.direction | default("stable") %}
        <tr>
          <td>{{ name }}</td>
          <td class="num">{{ ind.latest | default("—") }}</td>
          <td class="num" style="color:{% if iz is not none and iz > 0 %}var(--pos){% elif iz is not none and iz < 0 %}var(--neg){% else %}var(--muted){% endif %};">
            {% if iz is not none %}{{ "%+.2f"|format(iz) }}{% else %}—{% endif %}
          </td>
          <td style="color:{% if idir=='improving' %}var(--pos){% elif idir=='worsening' %}var(--neg){% else %}var(--muted){% endif %};">{{ idir }}</td>
        </tr>
        {% endfor %}
      </table>
      {% endif %}
      </div>
    </div>
    {% endif %}

    <!-- Earnings Transcript Sentiment -->
    {% set transcripts = snapshot.earnings_transcripts | default([]) %}
    {% if transcripts %}
    <div class="card">{% set _h="Earnings call tone analysis: SEC 8-K press releases are scored by LLM for bullish/bearish/mixed tone, key themes, and guidance direction. Covers the most recent quarterly report for each tracked stock." %}{{ hint(_h) }}
      <h2>Earnings Transcript Sentiment <button class="chev-btn" onclick="toggleCard(this,'cb_trans')" aria-label="expand" style="transform:rotate(-90deg)">▾</button></h2>
      <div class="card-body collapsed" id="cb_trans">
      <table style="width:100%;font-size:11px;">
        <tr><th style="text-align:left;">Ticker</th><th style="text-align:left;">Date</th><th style="text-align:left;">Tone</th><th style="text-align:left;">Guidance</th><th style="text-align:left;">Themes</th></tr>
        {% for t in transcripts %}
        {% set tc = "var(--pos)" if t.tone=="bullish" else ("var(--neg)" if t.tone=="bearish" else "var(--neu)") %}
        <tr>
          <td><strong>{{ t.ticker }}</strong></td>
          <td>{{ t.date }}</td>
          <td style="color:{{ tc }};font-weight:600;">{{ t.tone | upper }}</td>
          <td style="color:{% if t.guidance=='raised' %}var(--pos){% elif t.guidance=='lowered' %}var(--neg){% else %}var(--muted){% endif %};">{{ t.guidance }}</td>
          <td style="color:var(--muted);">{{ (t.themes | default([]) | join(", "))[:60] }}</td>
        </tr>
        {% endfor %}
      </table>
      </div>
    </div>
    {% endif %}

    <!-- Backtest Results with equity curve charts -->
    {% set bt = snapshot.backtest_ranked | default([]) %}
    {% if bt %}
    <div class="card">{% set _h="Signal performance backtest using actual paper trades in DB. Sharpe ratio = risk-adjusted returns (higher is better). Win rate = % of trades profitable. Equity curve = $100 starting capital compounded per trade." %}{{ hint(_h) }}
      <h2>Signal Backtest Results <button class="chev-btn" onclick="toggleCard(this,'cb_bt')" aria-label="expand" style="transform:rotate(-90deg)">▾</button></h2>
      <div class="card-body collapsed" id="cb_bt">
      <table style="width:100%;font-size:11px;">
        <tr>
          <th style="text-align:left;">Signal</th>
          <th class="num">n</th>
          <th class="num">Win%</th>
          <th class="num">Avg PnL</th>
          <th class="num">Sharpe</th>
          <th class="num">MaxDD</th>
          <th class="num">Return</th>
          <th style="width:80px;">Curve</th>
        </tr>
        {% for s in bt %}
        {% set sr = s.sharpe | default(none) %}
        {% set wr = ((s.win_rate | default(0)) * 100) | round | int %}
        {% set sid = loop.index %}
        <tr>
          <td style="font-size:10px;">{{ s.signal_name | replace("_"," ") }}</td>
          <td class="num">{{ s.n_trades }}</td>
          <td class="num" style="color:{% if wr >= 60 %}var(--pos){% elif wr < 40 %}var(--neg){% else %}var(--neu){% endif %};">{{ wr }}%</td>
          <td class="num pnl-{{ 'pos' if s.avg_pnl_pct|default(0) > 0 else 'neg' }}">{{ "%+.2f"|format(s.avg_pnl_pct | default(0)) }}%</td>
          <td class="num" style="color:{% if sr is not none and sr > 1 %}var(--pos){% elif sr is not none and sr < 0 %}var(--neg){% else %}var(--muted){% endif %};">
            {% if sr is not none %}{{ "%.2f"|format(sr) }}{% else %}—{% endif %}</td>
          <td class="num" style="color:{% if (s.max_drawdown_pct|default(0)) < -5 %}var(--neg){% else %}var(--muted){% endif %};">
            {{ "%.1f"|format(s.max_drawdown_pct | default(0)) }}%</td>
          <td class="num pnl-{{ 'pos' if s.total_return_pct|default(0) > 0 else 'neg' }}">{{ "%+.1f"|format(s.total_return_pct | default(0)) }}%</td>
          <td><canvas id="eq{{ sid }}" height="28" width="80"
            data-curve="{{ s.equity_curve | default([]) | tojson }}"></canvas></td>
        </tr>
        {% endfor %}
      </table>
      </div>
    </div>
    {% endif %}

    <!-- Risk Flags -->
    <div class="card">{% set _h="Events or conditions that could invalidate the brief's thesis. HIGH = act on it now. MEDIUM = monitor closely. LOW = background risk to keep in mind." %}{{ hint(_h) }}
      <h2>Risk Flags <button class="chev-btn" onclick="toggleCard(this,'cb_risk')" aria-label="collapse">▾</button></h2>
      <div class="card-body" id="cb_risk">
      {% for r in brief.risk_flags %}
      <div class="risk-item">
        <span class="badge badge-{{ r.severity }}">{{ r.severity|upper }}</span>
        <strong>{{ r.flag }}</strong>
        <div class="meta" style="margin-top:3px;">{{ r.explanation }}</div>
      </div>
      {% endfor %}
      </div>
    </div>

  </aside>
</main>

{% if brief.closing_note %}
<div class="footer"><strong>Closing note:</strong> {{ brief.closing_note }}</div>
{% endif %}
<div class="footer">AI Quant Bot · {{ brief.as_of }} · Powered by Groq / Llama · Self-correcting via trade journal</div>

<script>
// ── News ticker speed ───────────────────────────────────────────
(function() {
  const inner = document.getElementById('tickerInner');
  if (!inner) return;
  // content is doubled — animate over half the total width
  const pxPerSec = 70;
  const halfWidth = inner.scrollWidth / 2;
  const dur = Math.max(20, halfWidth / pxPerSec);
  inner.style.animation = `ticker-scroll ${dur.toFixed(1)}s linear infinite`;
  inner.addEventListener('mouseenter', () => inner.style.animationPlayState = 'paused');
  inner.addEventListener('mouseleave', () => inner.style.animationPlayState = 'running');
})();

// ── Macro summary toggle ────────────────────────────────────────
function toggleMacro() {
  const tech    = document.getElementById('macroTech');
  const simple  = document.getElementById('macroSimple');
  const btn     = document.getElementById('macroToggle');
  if (!tech || !simple || !btn) return;
  const showingSimple = simple.style.display !== 'none';
  if (showingSimple) {
    simple.style.display = 'none';
    tech.style.display   = '';
    btn.textContent = 'Plain English';
    btn.style.color = 'var(--muted)';
    btn.style.borderColor = 'var(--border)';
  } else {
    tech.style.display   = 'none';
    simple.style.display = '';
    btn.textContent = 'Technical';
    btn.style.color = 'var(--neu)';
    btn.style.borderColor = 'var(--neu)';
  }
}

// ── ? hint toggle ───────────────────────────────────────────────
function toggleHint(btn) {
  const bubble = btn.nextElementSibling;
  const isOpen = bubble.classList.contains('open');
  // close all other open bubbles first
  document.querySelectorAll('.hint-bubble.open').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.hint-btn.active').forEach(b => b.classList.remove('active'));
  if (!isOpen) {
    bubble.classList.add('open');
    btn.classList.add('active');
    // flip bubble above the button if it would go off-screen below
    requestAnimationFrame(() => {
      const r = bubble.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 8) {
        bubble.style.top = 'auto';
        bubble.style.bottom = '36px';
      } else {
        bubble.style.top = '';
        bubble.style.bottom = '';
      }
    });
  }
}
// close bubble when clicking anywhere else
document.addEventListener('click', e => {
  if (!e.target.closest('.hint-btn')) {
    document.querySelectorAll('.hint-bubble.open').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.hint-btn.active').forEach(b => b.classList.remove('active'));
  }
});

// ── Live Activity Feed ──────────────────────────────────────────
const LEVEL_ICONS = { info:'·', success:'✓', warning:'⚠', error:'✕', decision:'→' };
let _actVisible = true;
let _lastEventCount = 0;

function toggleActivity() {
  _actVisible = !_actVisible;
  document.getElementById('actLog').style.display = _actVisible ? '' : 'none';
  document.getElementById('actToggleBtn').textContent = _actVisible ? 'Hide' : 'Show';
}

async function refreshActivity() {
  try {
    const res = await fetch('activity_feed.json?t=' + Date.now());
    if (!res.ok) return;
    const events = await res.json();
    if (!events.length) return;

    const dot = document.getElementById('actDot');
    const status = document.getElementById('actStatus');
    const log = document.getElementById('actLog');

    // Detect if bot is currently running (last event < 3 min ago)
    const last = events[events.length - 1];
    const lastStep = last.step || '';
    const isRunning = lastStep !== 'done' && events.length !== _lastEventCount;
    _lastEventCount = events.length;

    if (lastStep === 'done') {
      dot.className = '';
      dot.style.background = 'var(--pos)';
      status.textContent = 'Idle — last run complete';
    } else if (isRunning || lastStep !== '') {
      dot.className = 'act-live';
      status.textContent = 'Running...';
    }

    // Render last 30 events as vertical rows, newest at bottom
    const visible = events.slice(-30);
    const rows = visible.map(ev => {
      const lvl = ev.level || 'info';
      return `<div class="act-row act-${lvl}">` +
        `<span class="act-ts">${escHtml(ev.ts)}</span>` +
        `<span class="act-tag">${lvl}</span>` +
        `<span class="act-msg">${escHtml(ev.msg)}</span>` +
        `</div>`;
    }).join('');

    log.innerHTML = rows;
    // Auto-scroll to latest (bottom)
    log.scrollTop = log.scrollHeight;
  } catch(e) { /* feed not ready yet */ }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

refreshActivity();
setInterval(refreshActivity, 3000);

// ── Mini return charts ──────────────────────────────────────────
function initMiniChart(canvas) {
  if (canvas._miInit) return;
  canvas._miInit = true;
  const d = canvas.dataset;
  const vals = [
    parseFloat(d.r1d) || 0,
    parseFloat(d.r1w) || 0,
    parseFloat(d.r1m) || 0,
    parseFloat(d.r3m) || 0,
  ];
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['1D','1W','1M','3M'],
      datasets: [{
        data: vals,
        backgroundColor: vals.map(v => v >= 0 ? 'rgba(40,199,111,0.75)' : 'rgba(234,84,85,0.75)'),
        borderRadius: 3,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + c.raw.toFixed(2) + '%' } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: '#262c38' }, ticks: { callback: v => v.toFixed(1)+'%', font: { size: 10 } } }
      }
    }
  });
}
function initMiniChartsIn(el) {
  el.querySelectorAll('canvas[data-mini]').forEach(initMiniChart);
}

// ── Sector call expand/collapse ─────────────────────────────────
function toggleSC(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.style.display !== 'none';
  document.querySelectorAll('[id^="sc_"]').forEach(e => e.style.display = 'none');
  if (!open) { el.style.display = 'block'; initMiniChartsIn(el); }
}

// ── Sidebar card collapse ────────────────────────────────────────
function toggleCard(btn, id) {
  const body = document.getElementById(id);
  if (!body) return;
  const isOpen = !body.classList.contains('collapsed');
  body.classList.toggle('collapsed');
  btn.style.transform = isOpen ? 'rotate(-90deg)' : '';
}

// ── Chart defaults ──────────────────────────────────────────────
Chart.defaults.color = '#8b95a7';
Chart.defaults.borderColor = '#262c38';
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
Chart.defaults.font.size = 11;

const POS = '#28c76f', NEG = '#ea5455', NEU = '#ffb547', MUT = '#8b95a7';

function barColor(v) { return v >= 0 ? 'rgba(40,199,111,0.75)' : 'rgba(234,84,85,0.75)'; }
function barColors(arr) { return arr.map(barColor); }

function hBar(id, labels, data, unit) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: barColors(data), borderRadius: 3, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + c.raw.toFixed(2) + (unit||'%') } } },
      scales: {
        x: { grid: { color: '#262c38' }, ticks: { callback: v => v.toFixed(1)+(unit||'%') } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ── Sector Rotation ─────────────────────────────────────────────
{% if snapshot.sector_rotation %}
(function(){
  const rows = {{ snapshot.sector_rotation | tojson }};
  const sorted = [...rows].sort((a,b) => (a.ret_1m||0)-(b.ret_1m||0));
  hBar('sectorChart',
    sorted.map(r => r.ticker),
    sorted.map(r => r.ret_1m != null ? +(r.ret_1m*100).toFixed(2) : 0)
  );
})();
{% endif %}

// ── International ETFs ──────────────────────────────────────────
{% if snapshot.international_etfs %}
(function(){
  const rows = {{ snapshot.international_etfs | tojson }};
  const sorted = [...rows].filter(r=>r.ret_1m!=null).sort((a,b)=>a.ret_1m-b.ret_1m);
  hBar('intlChart',
    sorted.map(r => r.ticker),
    sorted.map(r => +(r.ret_1m*100).toFixed(2))
  );
})();
{% endif %}

// ── Bond ETFs ───────────────────────────────────────────────────
{% if snapshot.bond_etfs %}
(function(){
  const rows = {{ snapshot.bond_etfs | tojson }};
  const labels = rows.map(r => r.ticker);
  const d1 = rows.map(r => r.ret_1d != null ? +(r.ret_1d*100).toFixed(2) : 0);
  const d1m = rows.map(r => r.ret_1m != null ? +(r.ret_1m*100).toFixed(2) : 0);
  const ctx = document.getElementById('bondChart');
  if (ctx) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '1d', data: d1, backgroundColor: barColors(d1), borderRadius: 3, borderSkipped: false },
          { label: '1m', data: d1m, backgroundColor: d1m.map(v => v>=0?'rgba(40,199,111,0.3)':'rgba(234,84,85,0.3)'), borderRadius: 3, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10 } },
          tooltip: { callbacks: { label: c => c.dataset.label+': '+c.raw.toFixed(2)+'%' } } },
        scales: {
          x: { grid: { display: false }, ticks: { font:{size:10} } },
          y: { grid: { color:'#262c38' }, ticks: { callback: v => v.toFixed(1)+'%' } }
        }
      }
    });
  }
})();
{% endif %}

// ── FX & Commodities ────────────────────────────────────────────
{% if snapshot.fx %}
(function(){
  const rows = {{ snapshot.fx | tojson }};
  const sorted = [...rows].filter(r=>r.ret_1d!=null).sort((a,b)=>a.ret_1d-b.ret_1d);
  hBar('fxChart',
    sorted.map(r => r.ticker || r.index),
    sorted.map(r => +(r.ret_1d*100).toFixed(2))
  );
})();
{% endif %}

// ── COT Positioning ─────────────────────────────────────────────
{% if snapshot.cot %}
(function(){
  const rows = {{ snapshot.cot | tojson }};
  const labels = rows.map(r => (r.market||'').replace(' Futures','').slice(0,12));
  const am = rows.map(r => r.asset_mgr_net_long || 0);
  const lf = rows.map(r => r.lev_fund_net_long || 0);
  const ctx = document.getElementById('cotChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Asset Mgr', data: am, backgroundColor: am.map(v=>v>=0?'rgba(40,199,111,0.75)':'rgba(234,84,85,0.75)'), borderRadius: 3 },
        { label: 'Lev Fund',  data: lf, backgroundColor: lf.map(v=>v>=0?'rgba(255,181,71,0.75)':'rgba(139,149,167,0.45)'), borderRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 10 } },
        tooltip: { callbacks: { label: c => c.dataset.label+': '+c.raw.toLocaleString() } } },
      scales: {
        x: { grid: { display: false }, ticks: { font:{size:10} } },
        y: { grid: { color:'#262c38' }, ticks: { callback: v => (v/1000).toFixed(0)+'k' } }
      }
    }
  });
})();
{% endif %}

// ── Options Flow P/C ────────────────────────────────────────────
{% if snapshot.options %}
(function(){
  const rows = {{ snapshot.options[:12] | tojson }};
  const valid = rows.filter(r => r.put_call_vol_ratio != null);
  const sorted = [...valid].sort((a,b) => b.put_call_vol_ratio - a.put_call_vol_ratio);
  const labels = sorted.map(r => r.ticker);
  const vals   = sorted.map(r => +r.put_call_vol_ratio.toFixed(2));
  const colors = vals.map(v => v >= 1.0 ? 'rgba(234,84,85,0.75)' : v <= 0.7 ? 'rgba(40,199,111,0.75)' : 'rgba(255,181,71,0.55)');
  const ctx = document.getElementById('pcChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'P/C Ratio', data: vals, backgroundColor: colors, borderRadius: 3 }] },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => 'P/C: '+c.raw } } },
      scales: {
        x: { grid: { color:'#262c38' }, min: 0,
             ticks: { callback: v => v.toFixed(1) } },
        y: { grid: { display: false }, ticks: { font:{size:10} } }
      }
    }
  });
})();
{% endif %}

// ── Short Interest ──────────────────────────────────────────────
{% if snapshot.short_interest %}
(function(){
  const rows = {{ snapshot.short_interest[:12] | tojson }};
  const valid = rows.filter(r => r.short_pct_float != null);
  const sorted = [...valid].sort((a,b) => b.short_pct_float - a.short_pct_float);
  const labels = sorted.map(r => r.ticker);
  const vals   = sorted.map(r => +r.short_pct_float.toFixed(1));
  const colors = vals.map(v => v > 15 ? 'rgba(234,84,85,0.8)' : v > 8 ? 'rgba(255,181,71,0.75)' : 'rgba(40,199,111,0.55)');
  const ctx = document.getElementById('siChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: '% Float Short', data: vals, backgroundColor: colors, borderRadius: 3 }] },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => c.raw+'% of float shorted' } },
        annotation: {} },
      scales: {
        x: { grid: { color:'#262c38' }, min: 0,
             ticks: { callback: v => v+'%' } },
        y: { grid: { display: false }, ticks: { font:{size:10} } }
      }
    }
  });
})();
{% endif %}

// ── Congressional Trades ────────────────────────────────────────
{% if snapshot.congressional_by_ticker %}
(function(){
  const rows = {{ snapshot.congressional_by_ticker[:12] | tojson }};
  const sorted = [...rows].sort((a,b) => (b.buys+b.sells)-(a.buys+a.sells));
  const labels = sorted.map(r => r.ticker);
  const buys   = sorted.map(r => r.buys || 0);
  const sells  = sorted.map(r => r.sells || 0);
  const tooltips = sorted.map(r => (r.politicians||[]).slice(0,3).join(', ') || '—');
  const ctx = document.getElementById('congressChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Buys',  data: buys,  backgroundColor: 'rgba(40,199,111,0.75)', borderRadius: 3, stack: 'a' },
        { label: 'Sells', data: sells, backgroundColor: 'rgba(234,84,85,0.75)',  borderRadius: 3, stack: 'a' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { boxWidth: 10 } },
        tooltip: { callbacks: {
          afterBody: (items) => 'Politicians: ' + tooltips[items[0].dataIndex]
        }}
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font:{size:10} } },
        y: { stacked: true, grid: { color:'#262c38' }, ticks: { stepSize: 1 } }
      }
    }
  });
})();
{% endif %}

// ── Open trades drawer toggle ───────────────────────────────────
function toggleDrawer(btn, drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  const isOpen = btn.classList.toggle('open');
  drawer.classList.toggle('open', isOpen);
  const label = btn.querySelector('.drawer-label');
  if (label) label.textContent = label.textContent.replace(isOpen ? 'Show' : 'Hide', isOpen ? 'Hide' : 'Show');
}

// ── Equity Curve ────────────────────────────────────────────────
{% if snapshot.paper_stats and snapshot.paper_stats.equity_curve and snapshot.paper_stats.equity_curve | length > 1 %}
(function(){
  const eq = {{ snapshot.paper_stats.equity_curve | tojson }};
  const ctx = document.getElementById('equityChart');
  if (!ctx) return;
  const vals = eq.map(r => r.cumulative_pnl);
  const lastVal = vals[vals.length-1] || 0;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: eq.map(r => r.date),
      datasets: [{
        data: vals,
        borderColor: lastVal >= 0 ? POS : NEG,
        backgroundColor: lastVal >= 0 ? 'rgba(40,199,111,0.1)' : 'rgba(234,84,85,0.1)',
        fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ' Cumulative: '+c.raw.toFixed(2)+'%' } } },
      scales: {
        x: { display: false },
        y: { grid: { color:'#262c38' }, ticks: { callback: v => v.toFixed(1)+'%' } }
      }
    }
  });
})();
{% endif %}

// ── Init mini charts that are visible at load (idea cards) ──────
(function() {
  document.querySelectorAll('canvas[data-mini]').forEach(function(c) {
    if (!c.closest('[style*="display:none"]')) initMiniChart(c);
  });
})();

// ── Equity curve sparklines (backtest table) ─────────────────────────────────
(function() {
  document.querySelectorAll('canvas[data-curve]').forEach(function(canvas) {
    try {
      var pts = JSON.parse(canvas.dataset.curve || '[]');
      if (pts.length < 2) return;
      var ctx = canvas.getContext('2d');
      var W = canvas.width, H = canvas.height;
      var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
      var range = max - min || 1;
      var color = pts[pts.length-1] >= pts[0] ? '#16a34a' : '#dc2626';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      pts.forEach(function(v, i) {
        var x = (i / (pts.length-1)) * W;
        var y = H - ((v - min) / range) * (H - 2) - 1;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    } catch(e) {}
  });
})();

// ── Search / filter ──────────────────────────────────────────────────────────
function filterCards(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('.card').forEach(card => {
    if (!q) { card.style.display = ''; return; }
    card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── Run Now button ───────────────────────────────────────────────────────────
function triggerRun() {
  const btn = document.getElementById('runNowBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Running…';
  fetch('/api/run', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
      if (d.status === 'already_running') {
        btn.textContent = '⚠ Already running';
      } else {
        btn.textContent = '✓ Started';
        setTimeout(() => { btn.disabled = false; btn.textContent = '▶ Run Now'; }, 5000);
      }
    })
    .catch(() => {
      btn.textContent = '✗ Error';
      setTimeout(() => { btn.disabled = false; btn.textContent = '▶ Run Now'; }, 3000);
    });
}

// ── Live price WebSocket + sparklines ────────────────────────────────────────
const _sparkHistory = {};  // ticker → last 20 price snapshots

(function connectPriceWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws/prices`);
  const alertEl  = document.getElementById('priceAlert');
  const stripEl  = document.getElementById('liveSparkStrip');
  const itemsEl  = document.getElementById('liveSparkItems');

  function renderSparkItems(alerts) {
    if (!itemsEl) return;
    stripEl.style.display = 'flex';
    alerts.slice(0, 8).forEach(function(a) {
      const tk = a.ticker || '';
      if (!tk) return;
      const chgMatch = a.text.match(/([+-]?[0-9]+[.][0-9]+)%/);
      const chg = chgMatch ? parseFloat(chgMatch[1]) : 0;
      const color = chg >= 0 ? '#16a34a' : '#dc2626';

      if (!_sparkHistory[tk]) _sparkHistory[tk] = [];
      _sparkHistory[tk].push(chg);
      if (_sparkHistory[tk].length > 20) _sparkHistory[tk].shift();

      let el = document.getElementById('spark_' + tk);
      if (!el) {
        el = document.createElement('div');
        el.id = 'spark_' + tk;
        el.style.cssText = 'display:flex;align-items:center;gap:5px;white-space:nowrap;';
        itemsEl.appendChild(el);
      }
      const pts = _sparkHistory[tk];
      const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 0.01;
      const W = 50, H = 20;
      const svgPts = pts.map((v,i) =>
        `${(i/(pts.length-1)*W).toFixed(1)},${(H - (v-min)/range*(H-2) - 1).toFixed(1)}`
      ).join(' ');
      el.innerHTML =
        `<span style="font-size:10px;font-weight:600;">${tk}</span>` +
        `<svg width="${W}" height="${H}" style="overflow:visible;">` +
        `<polyline points="${svgPts}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>` +
        `<span style="font-size:10px;color:${color};">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>`;
    });
  }

  ws.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.ping) return;
      if (d.type === 'price_alert' && d.alerts && d.alerts.length) {
        alertEl.style.display = 'block';
        alertEl.textContent = '🔔 ' + d.alerts.slice(0,3).map(a => a.text.replace(/[*]/g,'')).join(' | ');
        setTimeout(() => { alertEl.style.display = 'none'; }, 60000);
        renderSparkItems(d.alerts);
      }
    } catch(e) {}
  };
  ws.onclose = () => setTimeout(connectPriceWS, 10000);
  ws.onerror = () => ws.close();
})();

</script>
</body>
</html>
"""


def render_html(brief: TradeBrief, snapshot: Dict[str, Any]) -> str:
    return Template(HTML_TEMPLATE).render(brief=brief, snapshot=snapshot)


def write_html(html: str, out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    return out_path
