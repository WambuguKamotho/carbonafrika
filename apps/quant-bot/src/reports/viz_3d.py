"""3D force-graph market intelligence visualization.

Served at /viz — a standalone WebGL page using 3d-force-graph.
Nodes = sectors, tickers, ETFs, crypto, macro indicators, open signals.
Edges = sector membership, correlations, signal targets.
Live updates via /ws/prices WebSocket.
"""

VIZ_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Market Intelligence 3D — AI Quant Bot</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000814;color:#c9d1d9;font-family:'JetBrains Mono',monospace,ui-monospace,system-ui;overflow:hidden}
#graph{position:fixed;inset:0}
/* ── Top bar ── */
#topbar{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;
  gap:16px;padding:10px 20px;background:rgba(0,8,20,.85);backdrop-filter:blur(8px);
  border-bottom:1px solid rgba(0,212,255,.15);pointer-events:none}
#topbar h1{font-size:13px;font-weight:700;letter-spacing:.12em;color:#00d4ff;white-space:nowrap}
.gauge{display:flex;flex-direction:column;align-items:center;min-width:60px}
.gauge-label{font-size:9px;color:#6e7681;text-transform:uppercase;letter-spacing:.08em}
.gauge-val{font-size:15px;font-weight:700;line-height:1.2}
#topbar .spacer{flex:1}
#live-dot{width:7px;height:7px;border-radius:50%;background:#00ff88;box-shadow:0 0 8px #00ff88;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
/* ── Info panel ── */
#info{position:fixed;top:52px;right:20px;width:260px;z-index:20;
  background:rgba(0,8,20,.9);backdrop-filter:blur(12px);
  border:1px solid rgba(0,212,255,.2);border-radius:10px;padding:14px;
  display:none;font-size:11px}
#info h2{font-size:13px;font-weight:700;margin-bottom:8px;color:#00d4ff}
.info-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.info-key{color:#6e7681}
.info-val{font-weight:600}
.pos{color:#3fb950}
.neg{color:#f85149}
/* ── Controls ── */
#controls{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:20;
  display:flex;gap:10px;align-items:center;background:rgba(0,8,20,.85);
  backdrop-filter:blur(8px);border:1px solid rgba(0,212,255,.15);border-radius:8px;padding:8px 14px}
.btn{background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.3);color:#00d4ff;
  border-radius:5px;padding:5px 12px;font-size:11px;cursor:pointer;transition:.2s;pointer-events:all;font-family:inherit}
.btn:hover{background:rgba(0,212,255,.25)}
.btn.active{background:rgba(0,212,255,.35);border-color:#00d4ff}
select{background:#0d1117;border:1px solid rgba(0,212,255,.3);color:#c9d1d9;
  border-radius:5px;padding:4px 8px;font-size:11px;font-family:inherit;cursor:pointer}
/* ── Legend ── */
#legend{position:fixed;top:52px;left:20px;z-index:20;
  background:rgba(0,8,20,.85);backdrop-filter:blur(8px);
  border:1px solid rgba(0,212,255,.15);border-radius:8px;padding:12px;font-size:10px}
#legend h3{font-size:10px;color:#6e7681;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
.leg-row{display:flex;align-items:center;gap:6px;margin-bottom:5px}
.leg-dot{width:9px;height:9px;border-radius:50%}
/* ── Alert flash ── */
#alert{position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:30;
  background:rgba(0,212,255,.15);border:1px solid #00d4ff;border-radius:6px;
  padding:8px 16px;font-size:11px;color:#00d4ff;display:none;pointer-events:none}
/* ── Loading ── */
#loading{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;
  align-items:center;justify-content:center;background:#000814;gap:12px}
#loading p{font-size:13px;color:#6e7681;letter-spacing:.1em}
.spinner{width:40px;height:40px;border:2px solid rgba(0,212,255,.2);
  border-top-color:#00d4ff;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>

<div id="loading">
  <div class="spinner"></div>
  <p>LOADING MARKET INTELLIGENCE...</p>
</div>

<div id="graph"></div>

<div id="topbar">
  <h1>&#9632; MARKET INTELLIGENCE 3D</h1>
  <div class="gauge">
    <span class="gauge-label">F&amp;G</span>
    <span class="gauge-val" id="fg-val" style="color:#fbbf24">—</span>
  </div>
  <div class="gauge">
    <span class="gauge-label">VIX</span>
    <span class="gauge-val" id="vix-val" style="color:#f85149">—</span>
  </div>
  <div class="gauge">
    <span class="gauge-label">ESI</span>
    <span class="gauge-val" id="esi-val" style="color:#3fb950">—</span>
  </div>
  <div class="gauge">
    <span class="gauge-label">Nodes</span>
    <span class="gauge-val" id="node-count" style="color:#00d4ff">—</span>
  </div>
  <div class="gauge">
    <span class="gauge-label">Win Rate</span>
    <span class="gauge-val" id="win-rate" style="color:#3fb950">—</span>
  </div>
  <div class="spacer"></div>
  <span style="font-size:10px;color:#6e7681">LIVE</span>
  <div id="live-dot"></div>
</div>

<div id="legend">
  <h3>Node Types</h3>
  <div class="leg-row"><div class="leg-dot" style="background:#ffffff;box-shadow:0 0 6px #fff"></div> Market Hub</div>
  <div class="leg-row"><div class="leg-dot" style="background:#00d4ff;box-shadow:0 0 6px #00d4ff"></div> Sector</div>
  <div class="leg-row"><div class="leg-dot" style="background:#a855f7;box-shadow:0 0 6px #a855f7"></div> ETF</div>
  <div class="leg-row"><div class="leg-dot" style="background:#3fb950;box-shadow:0 0 6px #3fb950"></div> Ticker (up)</div>
  <div class="leg-row"><div class="leg-dot" style="background:#f85149;box-shadow:0 0 6px #f85149"></div> Ticker (down)</div>
  <div class="leg-row"><div class="leg-dot" style="background:#f7931a;box-shadow:0 0 6px #f7931a"></div> Crypto</div>
  <div class="leg-row"><div class="leg-dot" style="background:#fbbf24;box-shadow:0 0 6px #fbbf24"></div> Macro</div>
  <div class="leg-row"><div class="leg-dot" style="background:#00ff88;box-shadow:0 0 6px #0f0"></div> Signal Long</div>
  <div class="leg-row"><div class="leg-dot" style="background:#ff4466;box-shadow:0 0 6px #f44"></div> Signal Short</div>
  <h3 style="margin-top:10px">Click node to inspect</h3>
</div>

<div id="info">
  <h2 id="info-name">—</h2>
  <div id="info-rows"></div>
</div>

<div id="alert"></div>

<div id="controls">
  <button class="btn active" id="btn-rotate" onclick="toggleRotate()">&#9654; Rotate</button>
  <button class="btn" id="btn-signals" onclick="toggleLayer('signal')">Signals</button>
  <button class="btn" id="btn-crypto" onclick="toggleLayer('crypto')">Crypto</button>
  <button class="btn" id="btn-macro" onclick="toggleLayer('macro')">Macro</button>
  <button class="btn" id="btn-edges" onclick="toggleEdges()">Edges</button>
  <select id="sector-filter" onchange="filterSector(this.value)">
    <option value="">All Sectors</option>
  </select>
  <button class="btn" onclick="resetCamera()">&#8635; Reset</button>
  <a href="/" class="btn" style="text-decoration:none">&#8592; Dashboard</a>
</div>

<script src="https://unpkg.com/3d-force-graph@1.73.2/dist/3d-force-graph.min.js"></script>
<script>
// ── Constants ─────────────────────────────────────────────────────────────────
const SECTOR_COLORS = {
  'Technology':     '#00d4ff',
  'Financials':     '#7c3aed',
  'Energy':         '#f59e0b',
  'Healthcare':     '#10b981',
  'Consumer':       '#ec4899',
  'Industrials':    '#6366f1',
  'Defense':        '#ef4444',
  'Materials':      '#84cc16',
  'Utilities':      '#06b6d4',
  'RealEstate':     '#f97316',
  'Communications': '#8b5cf6',
  'Staples':        '#14b8a6',
};

// ── State ─────────────────────────────────────────────────────────────────────
let Graph, gData = { nodes: [], links: [] };
let rotating = true, showEdges = true;
let hiddenTypes = new Set();
let nodeMap = {};
let snapshot = {};

// ── Helpers ───────────────────────────────────────────────────────────────────
function sectorColor(s) { return SECTOR_COLORS[s] || '#60a5fa'; }
function retColor(pct) {
  if (pct === null || pct === undefined) return '#6e7681';
  if (pct > 2)  return '#3fb950';
  if (pct > 0)  return '#28a745';
  if (pct > -2) return '#d73a49';
  return '#f85149';
}
function lerp(a, b, t) { return a + (b - a) * t; }

// ── Build graph from snapshot ─────────────────────────────────────────────────
function buildGraph(snap) {
  const nodes = [], links = [];
  nodeMap = {};
  const sectors = snap.sector_etfs_map || {};
  const sectorStocks = snap.sectors || {};
  const rotData = snap.sector_rotation || [];
  const rotMap = {};
  rotData.forEach(r => { if (r.ticker) rotMap[r.ticker] = r; });

  // Central hub
  nodes.push({ id: 'MARKET', label: 'MARKET HUB', type: 'hub', color: '#ffffff',
    __size: 12, val: 50,
    __data: { description: 'Global market centre of gravity', nodes_total: 0 } });

  // Macro nodes
  const fg = snap.fear_greed || {};
  const cb = snap.cboe || {};
  const esi = snap.economic_surprise || {};

  if (fg.value !== undefined) {
    const fgColor = fg.value < 30 ? '#3fb950' : fg.value > 70 ? '#f85149' : '#fbbf24';
    nodes.push({ id: 'FEAR_GREED', label: `F&G ${fg.value}`, type: 'macro',
      color: fgColor, __size: 7, val: 20,
      __data: { 'Fear & Greed': fg.value, Label: fg.label, Signal: fg.signal, Trend: fg.trend } });
    links.push({ source: 'FEAR_GREED', target: 'MARKET', color: '#fbbf2460', width: 1 });
  }
  if (cb.vix !== undefined) {
    const vixColor = cb.vix >= 30 ? '#f85149' : cb.vix <= 13 ? '#f97316' : '#60a5fa';
    nodes.push({ id: 'VIX', label: `VIX ${cb.vix}`, type: 'macro',
      color: vixColor, __size: 7, val: 20,
      __data: { VIX: cb.vix, VIX3M: cb.vix3m, SKEW: cb.skew, Signal: cb.signal } });
    links.push({ source: 'VIX', target: 'MARKET', color: '#f8514960', width: 1 });
  }
  if (esi.composite_score !== undefined) {
    const esiColor = esi.composite_score > 0.5 ? '#3fb950' : esi.composite_score < -0.5 ? '#f85149' : '#fbbf24';
    nodes.push({ id: 'ESI', label: `ESI ${esi.composite_score}`, type: 'macro',
      color: esiColor, __size: 7, val: 20,
      __data: { Score: esi.composite_score, Regime: esi.regime, Signal: esi.signal, Rationale: esi.rationale } });
    links.push({ source: 'ESI', target: 'MARKET', color: '#3fb95060', width: 1 });
  }

  // Sectors + ETFs — built from sector_etfs_map + sector_rotation
  const sectorFilter = document.getElementById('sector-filter');
  Object.entries(sectors).forEach(([sName, etfTicker]) => {
    const sc = sectorColor(sName);
    const sId = `SECTOR_${sName}`;
    const etfRot = rotMap[etfTicker] || {};
    const ret1d = etfRot.ret_1d;

    nodes.push({ id: sId, label: sName, type: 'sector', sector: sName,
      color: sc, __size: 9, val: 30,
      __data: { Sector: sName, ETF: etfTicker,
        '1d': ret1d != null ? `${ret1d.toFixed(2)}%` : '—',
        '1m': etfRot.ret_1m != null ? `${etfRot.ret_1m.toFixed(2)}%` : '—',
        '3m': etfRot.ret_3m != null ? `${etfRot.ret_3m.toFixed(2)}%` : '—' } });
    links.push({ source: sId, target: 'MARKET', color: sc + '50', width: 1.5 });

    // ETF node — coloured by performance
    nodes.push({ id: etfTicker, label: etfTicker, type: 'etf', sector: sName,
      color: retColor(ret1d), __size: 6, val: 18,
      __data: { Ticker: etfTicker, Sector: sName,
        '1d': ret1d != null ? `${ret1d.toFixed(2)}%` : '—',
        '1m': etfRot.ret_1m != null ? `${etfRot.ret_1m.toFixed(2)}%` : '—' } });
    links.push({ source: etfTicker, target: sId, color: sc + '70', width: 1 });

    const opt = document.createElement('option');
    opt.value = sName; opt.textContent = sName;
    sectorFilter.appendChild(opt);
  });

  // FX & commodity nodes — from snap.fx
  const fxItems = snap.fx || [];
  const fxHub = { id: 'FX_HUB', label: 'FX & COMMOD', type: 'macro',
    color: '#60a5fa', __size: 7, val: 18, __data: { Description: 'FX & Commodities cluster' } };
  if (fxItems.length) {
    nodes.push(fxHub);
    links.push({ source: 'FX_HUB', target: 'MARKET', color: '#60a5fa40', width: 1 });
    fxItems.slice(0, 12).forEach(fx => {
      const tk = fx.ticker;
      if (!tk || nodeMap[tk]) return;
      const ret = fx.ret_1d;
      nodes.push({ id: tk, label: tk, type: 'ticker', sector: 'FX',
        color: retColor(ret), __size: 3.5, val: 8,
        __data: { Ticker: tk, '1d': ret != null ? `${ret.toFixed(2)}%` : '—',
          '1m': fx.ret_1m != null ? `${fx.ret_1m.toFixed(2)}%` : '—',
          Price: fx.last != null ? fx.last : '—' } });
      links.push({ source: tk, target: 'FX_HUB', color: retColor(ret) + '50', width: 0.5 });
    });
  }

  // Crypto nodes + cluster link
  const crypto = snap.crypto || {};
  const cryptoPrices = crypto.prices || [];
  if (cryptoPrices.length) {
    nodes.push({ id: 'CRYPTO_HUB', label: 'CRYPTO', type: 'macro',
      color: '#f7931a', __size: 7, val: 20,
      __data: { Regime: (crypto.regime || {}).regime, Signal: (crypto.regime || {}).signal } });
    links.push({ source: 'CRYPTO_HUB', target: 'MARKET', color: '#f7931a50', width: 1 });
    cryptoPrices.forEach(c => {
      const ret = c.chg_24h_pct;
      nodes.push({ id: `CRYPTO_${c.symbol}`, label: c.symbol, type: 'crypto',
        color: '#f7931a', __size: 5, val: 12,
        __data: { Coin: c.name, Price: c.price_usd ? `$${c.price_usd.toLocaleString()}` : '—',
          '24h': ret != null ? `${ret.toFixed(2)}%` : '—',
          '7d': c.chg_7d_pct != null ? `${c.chg_7d_pct.toFixed(2)}%` : '—',
          'MCap': c.market_cap_b ? `$${c.market_cap_b}B` : '—' } });
      links.push({ source: `CRYPTO_${c.symbol}`, target: 'CRYPTO_HUB',
        color: '#f7931a60', width: 0.5 });
    });
  }

  // Open signal nodes
  const openTrades = snap.open_trades || [];
  openTrades.slice(0, 20).forEach((t, i) => {
    const isLong = t.direction === 'long';
    const sc = isLong ? '#00ff88' : '#ff4466';
    const sId = `SIG_${i}`;
    nodes.push({ id: sId, label: t.signal_name ? t.signal_name.replace(/_/g,' ') : 'signal',
      type: isLong ? 'signal_long' : 'signal_short',
      color: sc, __size: 3, val: 6,
      __data: { Ticker: t.ticker, Direction: t.direction,
        Signal: t.signal_name,
        'P&L': t.pnl_pct != null ? `${t.pnl_pct.toFixed(2)}%` : 'open',
        Entry: t.entry_price ? `$${t.entry_price}` : '—' } });
    if (nodeMap[t.ticker] || nodes.find(n => n.id === t.ticker)) {
      links.push({ source: sId, target: t.ticker, color: sc + '80', width: 0.8 });
    } else {
      links.push({ source: sId, target: 'MARKET', color: sc + '40', width: 0.5 });
    }
  });

  // Mark nodeMap for lookup
  nodes.forEach(n => { nodeMap[n.id] = n; });

  // Update top bar
  document.getElementById('node-count').textContent = nodes.length;
  const ps = snap.paper_stats || {};
  if (ps.win_rate_pct != null)
    document.getElementById('win-rate').textContent = ps.win_rate_pct.toFixed(1) + '%';
  if (fg.value != null)
    document.getElementById('fg-val').textContent = fg.value;
  if (cb.vix != null)
    document.getElementById('vix-val').textContent = cb.vix.toFixed(1);
  if (esi.composite_score != null) {
    const esiEl = document.getElementById('esi-val');
    esiEl.textContent = (esi.composite_score >= 0 ? '+' : '') + esi.composite_score.toFixed(2);
    esiEl.style.color = esi.composite_score > 0.5 ? '#3fb950' : esi.composite_score < -0.5 ? '#f85149' : '#fbbf24';
  }

  return { nodes, links };
}

// ── Info panel ─────────────────────────────────────────────────────────────────
function showInfo(node) {
  const panel = document.getElementById('info');
  document.getElementById('info-name').textContent = node.label || node.id;
  const rows = document.getElementById('info-rows');
  rows.innerHTML = '';
  const data = node.__data || {};
  Object.entries(data).forEach(([k, v]) => {
    if (!v && v !== 0) return;
    const pct = typeof v === 'string' && v.includes('%');
    const positive = pct && parseFloat(v) >= 0;
    const cls = pct ? (positive ? 'pos' : 'neg') : '';
    rows.innerHTML += `<div class="info-row">
      <span class="info-key">${k}</span>
      <span class="info-val ${cls}">${v}</span>
    </div>`;
  });
  rows.innerHTML += `<div class="info-row">
    <span class="info-key">Type</span>
    <span class="info-val">${node.type}</span>
  </div>`;
  panel.style.display = 'block';
}

// ── Controls ──────────────────────────────────────────────────────────────────
function toggleRotate() {
  rotating = !rotating;
  document.getElementById('btn-rotate').classList.toggle('active', rotating);
}
function toggleEdges() {
  showEdges = !showEdges;
  document.getElementById('btn-edges').classList.toggle('active', showEdges);
  Graph.linkVisibility(link => showEdges);
}
function toggleLayer(type) {
  const btn = document.getElementById(`btn-${type}`);
  if (hiddenTypes.has(type)) { hiddenTypes.delete(type); btn.classList.remove('active'); }
  else { hiddenTypes.add(type); btn.classList.add('active'); }
  applyFilters();
}
function filterSector(val) {
  applyFilters(val);
}
function applyFilters(sectorVal) {
  const sf = sectorVal !== undefined ? sectorVal : document.getElementById('sector-filter').value;
  Graph.nodeVisibility(node => {
    if (hiddenTypes.has(node.type)) return false;
    if (hiddenTypes.has('signal') && (node.type === 'signal_long' || node.type === 'signal_short')) return false;
    if (hiddenTypes.has('crypto') && (node.type === 'crypto' || node.id === 'CRYPTO_HUB')) return false;
    if (hiddenTypes.has('macro') && node.type === 'macro') return false;
    if (sf && node.sector && node.sector !== sf) return false;
    return true;
  });
  Graph.linkVisibility(link => {
    if (!showEdges) return false;
    const src = typeof link.source === 'object' ? link.source : nodeMap[link.source];
    const tgt = typeof link.target === 'object' ? link.target : nodeMap[link.target];
    if (!src || !tgt) return true;
    return Graph.nodeVisibility()(src) && Graph.nodeVisibility()(tgt);
  });
}
function resetCamera() {
  Graph.cameraPosition({ x: 0, y: 0, z: 400 }, { x: 0, y: 0, z: 0 }, 800);
}

// ── WebSocket live updates ────────────────────────────────────────────────────
function flashNode(ticker, flashColor, duration = 1500) {
  const node = nodeMap[ticker] || nodeMap[`CRYPTO_${ticker}`];
  if (!node) return;
  const orig = node.color;
  node.color = flashColor;
  Graph.nodeColor(n => n.color);          // trigger re-render
  setTimeout(() => {
    node.color = orig;
    Graph.nodeColor(n => n.color);
  }, duration);
}

function showAlert(msg, duration = 4000) {
  const el = document.getElementById('alert');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, duration);
}

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws/prices`);
  ws.onmessage = ev => {
    try {
      const d = JSON.parse(ev.data);
      if (d.ping) return;
      if (d.type === 'price_alert' && d.alerts) {
        d.alerts.slice(0, 6).forEach(a => {
          const tk = a.ticker || '';
          const chgMatch = a.text.match(/([+-]?[0-9]+[.][0-9]+)%/);
          const chg = chgMatch ? parseFloat(chgMatch[1]) : 0;
          flashNode(tk, chg >= 0 ? '#00ff88' : '#ff4466');
        });
        const top = d.alerts[0];
        if (top) showAlert(`🔔 ${top.text.replace(/[*]/g, '')}`, 5000);
      }
    } catch(e) {}
  };
  ws.onclose = () => setTimeout(connectWS, 8000);
  ws.onerror = () => ws.close();
}

// ── Init ──────────────────────────────────────────────────────────────────────
fetch('/api/snapshot')
  .then(r => r.json())
  .then(snap => {
    snapshot = snap;
    gData = buildGraph(snap);

    Graph = ForceGraph3D({ controlType: 'orbit' })(document.getElementById('graph'))
      .backgroundColor('#000814')
      .showNavInfo(false)
      .nodeLabel(node => `<div style="
        background:rgba(0,8,20,.9);border:1px solid ${node.color};
        border-radius:5px;padding:4px 8px;font-size:11px;color:#fff;
        font-family:monospace;white-space:nowrap;">${node.label || node.id}</div>`)
      .nodeVal(node => node.val || 10)
      .nodeColor(node => node.color)
      .linkColor(link => link.color || '#ffffff20')
      .linkWidth(link => link.width || 0.5)
      .linkOpacity(0.7)
      .linkDirectionalParticles(link => {
        if (link.source && link.target) {
          const src = typeof link.source === 'object' ? link.source : nodeMap[link.source];
          if (src && (src.type === 'signal_long' || src.type === 'signal_short')) return 3;
        }
        return 0;
      })
      .linkDirectionalParticleWidth(2)
      .linkDirectionalParticleColor(link => link.color || '#ffffff')
      .onNodeClick(node => { showInfo(node); })
      .onBackgroundClick(() => { document.getElementById('info').style.display = 'none'; })
      .graphData(gData);

    // Auto-rotate loop
    let angle = 0;
    Graph.onEngineTick(() => {
      if (!rotating) return;
      angle += 0.001;
      const dist = Graph.camera().position.distanceTo({ x: 0, y: 0, z: 0 }) || 400;
      Graph.cameraPosition({ x: dist * Math.sin(angle), y: 0, z: dist * Math.cos(angle) });
    });

    // Force config for nice layout
    Graph.d3Force('charge').strength(-120);
    Graph.d3Force('link').distance(link => {
      const src = typeof link.source === 'object' ? link.source : nodeMap[link.source];
      if (src && src.type === 'hub') return 80;
      if (src && src.type === 'sector') return 60;
      return 40;
    });

    document.getElementById('loading').style.display = 'none';
    connectWS();
  })
  .catch(err => {
    document.getElementById('loading').innerHTML =
      `<p style="color:#f85149">Failed to load snapshot: ${err.message}</p>
       <a href="/api/snapshot" style="color:#00d4ff;font-size:11px">Check /api/snapshot</a>`;
  });
</script>
</body>
</html>"""
