import { useState, useEffect, useRef, useCallback } from "react";

// ─── ENV VARS ─────────────────────────────────────────────────────────────────
const TD_KEY     = import.meta.env.VITE_TWELVEDATA_KEY ?? "";
const GROQ_KEY   = import.meta.env.VITE_GROQ_KEY       ?? "";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const DEFAULT_WATCHLIST = ["AAPL", "TSLA", "NVDA", "MSFT", "META", "AMZN"];

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #07080a;
      --surface:  #0e1014;
      --surface2: #141720;
      --border:   #1a1e27;
      --border2:  #222835;
      --text:     #eceef4;
      --text2:    #6e7a8a;
      --text3:    #3a4252;
      --accent:   #ff4422;
      --green:    #00e676;
      --yellow:   #f5c842;
      --blue:     #4e9eff;
      --purple:   #a78bfa;
      --mono:     'IBM Plex Mono', monospace;
      --sans:     'IBM Plex Sans', sans-serif;
    }

    html, body { height: 100%; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--mono);
      overflow-x: hidden;
      min-height: 100vh;
    }

    ::-webkit-scrollbar { width: 3px; height: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

    .page { min-height: 100vh; display: flex; flex-direction: column; }

    /* ── Nav ── */
    .nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 36px; border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
      background: rgba(7,8,10,0.94); backdrop-filter: blur(16px);
    }
    .nav-brand { display: flex; align-items: baseline; gap: 12px; }
    .nav-logo { font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: var(--text); }
    .nav-version { font-size: 8px; color: var(--text3); letter-spacing: 0.12em; }
    .nav-tabs { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 3px; }
    .nav-tab {
      padding: 6px 16px; font-size: 9px; font-family: var(--mono); font-weight: 600;
      letter-spacing: 0.14em; cursor: pointer; border-radius: 4px; transition: all 0.15s;
      color: var(--text3); background: transparent; border: none; text-transform: uppercase;
    }
    .nav-tab:hover { color: var(--text2); }
    .nav-tab.active { background: var(--surface2); color: var(--text); border: 1px solid var(--border2); }
    .nav-right { display: flex; align-items: center; gap: 14px; }
    .live-pill {
      display: flex; align-items: center; gap: 6px;
      background: rgba(0,230,118,0.06); border: 1px solid rgba(0,230,118,0.15);
      border-radius: 20px; padding: 4px 10px; font-size: 8px; letter-spacing: 0.12em; color: var(--green);
    }
    .live-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: pulse 1.8s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
    .nav-time { font-size: 10px; color: var(--text3); letter-spacing: 0.06em; font-variant-numeric: tabular-nums; }

    /* ── Ticker ── */
    .ticker-bar { display: flex; overflow-x: auto; border-bottom: 1px solid var(--border); background: var(--surface); scrollbar-width: none; }
    .ticker-bar::-webkit-scrollbar { display: none; }
    .ticker-item {
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
      padding: 7px 20px; font-size: 10px; letter-spacing: 0.06em;
      border-right: 1px solid var(--border); white-space: nowrap; cursor: pointer;
      transition: background 0.12s; position: relative;
    }
    .ticker-item:hover { background: var(--surface2); }
    .ticker-item.selected { background: var(--surface2); }
    .ticker-item.selected::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
      background: var(--accent);
    }
    .ticker-sym { font-weight: 700; color: var(--text); font-size: 11px; }
    .ticker-price { color: var(--text2); font-variant-numeric: tabular-nums; }
    .ticker-chg { font-variant-numeric: tabular-nums; }
    .ticker-chg.up   { color: var(--green); }
    .ticker-chg.down { color: var(--accent); }
    .ticker-chg.flat { color: var(--text3); }
    .ticker-spark { margin-left: 4px; }

    /* ── Section label ── */
    .section-label {
      font-size: 8px; letter-spacing: 0.22em; color: var(--text3); font-weight: 700;
      text-transform: uppercase; padding-bottom: 10px; border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }

    /* ── Cards ── */
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
    .card-sm { padding: 12px 16px; }
    .card-hover { transition: border-color 0.15s; cursor: pointer; }
    .card-hover:hover { border-color: var(--border2); }

    /* ── Buttons ── */
    .btn {
      font-family: var(--mono); font-size: 9px; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase;
      padding: 9px 18px; border-radius: 5px; cursor: pointer;
      transition: all 0.14s; border: 1px solid transparent; display: inline-flex; align-items: center; gap: 6px;
    }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-primary { background: var(--text); color: var(--bg); border-color: var(--text); }
    .btn-primary:not(:disabled):hover { background: transparent; color: var(--text); }
    .btn-outline { background: transparent; color: var(--text2); border-color: var(--border2); }
    .btn-outline:not(:disabled):hover { color: var(--text); border-color: var(--text3); }
    .btn-accent { background: var(--accent); color: white; border-color: var(--accent); }
    .btn-accent:not(:disabled):hover { background: transparent; color: var(--accent); }
    .btn-ghost { background: transparent; color: var(--text3); border-color: transparent; padding: 6px 10px; }
    .btn-ghost:not(:disabled):hover { color: var(--text2); background: var(--surface2); }

    /* ── Input ── */
    .input {
      background: var(--surface); border: 1px solid var(--border2);
      color: var(--text); font-family: var(--mono); font-size: 11px;
      padding: 9px 13px; border-radius: 5px; outline: none; width: 100%;
      transition: border-color 0.15s;
    }
    .input:focus { border-color: var(--text3); }
    .input::placeholder { color: var(--text3); }

    /* ── Tags ── */
    .tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 3px; font-size: 8px;
      font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    }
    .tag-bull    { background: rgba(0,230,118,0.08);  color: var(--green);  border: 1px solid rgba(0,230,118,0.18); }
    .tag-bear    { background: rgba(255,68,34,0.08);  color: var(--accent); border: 1px solid rgba(255,68,34,0.18); }
    .tag-neutral { background: rgba(245,200,66,0.08); color: var(--yellow); border: 1px solid rgba(245,200,66,0.18); }

    /* ── News ── */
    .news-item { padding: 14px 0; border-bottom: 1px solid var(--border); animation: fadeUp 0.3s ease-out both; }
    .news-item:last-child { border-bottom: none; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    .news-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; flex-wrap: wrap; }
    .news-source { font-size: 8px; color: var(--text3); letter-spacing: 0.12em; text-transform: uppercase; }
    .news-time   { font-size: 8px; color: var(--text3); }
    .news-title  { font-size: 12px; color: var(--text); line-height: 1.65; font-family: var(--sans); font-weight: 400; }
    .impact-bar-wrap { flex: 1; height: 2px; background: var(--border2); border-radius: 2px; overflow: hidden; min-width: 40px; }
    .impact-bar { height: 100%; border-radius: 2px; transition: width 0.9s cubic-bezier(0.4,0,0.2,1); }

    /* ── Charts ── */
    .chart-wrap { position: relative; width: 100%; }
    canvas { display: block; width: 100% !important; }

    /* ── Grid ── */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

    /* ── Stat ── */
    .stat-label { font-size: 8px; color: var(--text3); letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 5px; }
    .stat-value { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: var(--text); font-variant-numeric: tabular-nums; }
    .stat-sub   { font-size: 10px; color: var(--text2); margin-top: 3px; }

    /* ── Loader ── */
    .loader { display: flex; align-items: center; gap: 8px; color: var(--text3); font-size: 10px; }
    .loader-dots span { display: inline-block; width: 3px; height: 3px; border-radius: 50%; background: var(--text3); margin: 0 2px; animation: dotBounce 1s ease-in-out infinite; }
    .loader-dots span:nth-child(2) { animation-delay: 0.16s; }
    .loader-dots span:nth-child(3) { animation-delay: 0.32s; }
    @keyframes dotBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

    /* ── Scroll area ── */
    .scroll-area { overflow-y: auto; max-height: 460px; padding-right: 3px; }

    /* ── Missing key banner ── */
    .env-banner {
      background: rgba(245,200,66,0.06); border: 1px solid rgba(245,200,66,0.2);
      border-radius: 8px; padding: 20px 24px; margin: 24px 36px;
    }
    .env-banner h3 { font-size: 11px; color: var(--yellow); margin-bottom: 8px; letter-spacing: 0.1em; }
    .env-banner p  { font-size: 10px; color: var(--text2); line-height: 1.7; }
    .env-banner code { font-family: var(--mono); background: var(--surface2); padding: 1px 6px; border-radius: 3px; font-size: 10px; color: var(--text); }

    /* ── Slide-in ── */
    .slide-in { animation: slideIn 0.25s ease-out; }
    @keyframes slideIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

    /* ── Legend ── */
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 9px; color: var(--text2); }
    .legend-dot   { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

    /* ── Probability arc ── */
    .prob-arc-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }

    /* ── Portfolio table ── */
    .port-table { width: 100%; border-collapse: collapse; }
    .port-table th { font-size: 8px; color: var(--text3); letter-spacing: 0.16em; text-transform: uppercase; padding: 8px 12px; text-align: right; border-bottom: 1px solid var(--border); font-weight: 600; }
    .port-table th:first-child { text-align: left; }
    .port-table td { padding: 10px 12px; font-size: 11px; text-align: right; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; }
    .port-table td:first-child { text-align: left; }
    .port-table tr:hover td { background: var(--surface2); }
    .port-table tr:last-child td { border-bottom: none; }

    /* ── Watchlist ── */
    .watchlist-add { display: flex; gap: 8px; }

    /* ── Number colors ── */
    .up   { color: var(--green)  !important; }
    .down { color: var(--accent) !important; }
    .flat { color: var(--text2)  !important; }

    /* ── Divider ── */
    .divider { height: 1px; background: var(--border); margin: 20px 0; }

    /* ── Progress bar ── */
    .progress-wrap { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .progress-bar  { height: 100%; border-radius: 2px; transition: width 0.6s ease; }

    /* ── Tooltip ── */
    .tooltip-wrap { position: relative; display: inline-flex; }
    .tooltip-wrap:hover .tooltip { opacity: 1; pointer-events: auto; }
    .tooltip {
      opacity: 0; pointer-events: none; transition: opacity 0.15s;
      position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
      background: var(--surface2); border: 1px solid var(--border2); border-radius: 4px;
      padding: 5px 9px; font-size: 8px; color: var(--text2); white-space: nowrap; z-index: 200;
    }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .nav { padding: 12px 18px; }
      .grid-2,.grid-3,.grid-4,.grid-5 { grid-template-columns: 1fr; }
      .main-split { flex-direction: column !important; }
    }
  `}</style>
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt     = (n, d = 2) => (n == null || !isFinite(n) ? "—" : n.toFixed(d));
const fmtPct  = (n) => (n >= 0 ? "+" : "") + fmt(n) + "%";
const colorChg = (n) => n > 0 ? "var(--green)" : n < 0 ? "var(--accent)" : "var(--text2)";
const classChg = (n) => n > 0 ? "up" : n < 0 ? "down" : "flat";

// Box-Muller normal sample
const randNorm = () => {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// ─── MATH ENGINE ─────────────────────────────────────────────────────────────

/** Geometric Brownian Motion Monte Carlo */
function runMonteCarlo({ S0, mu, sigma, days, n = 600, sentimentAdj = 0 }) {
  if (!S0 || !isFinite(S0) || !isFinite(mu) || !isFinite(sigma) || sigma <= 0) return [];
  const dt     = 1 / 252;
  const adjMu  = mu + sentimentAdj;
  const paths  = [];
  for (let i = 0; i < n; i++) {
    const path = [S0];
    for (let d = 1; d <= days; d++) {
      const prev = path[path.length - 1];
      const next = prev * Math.exp((adjMu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * randNorm());
      path.push(isFinite(next) && next > 0 ? next : prev);
    }
    paths.push(path);
  }
  return paths;
}

/** 3-state Markov chain: Bear(0) / Neutral(1) / Bull(2) */
function buildMarkovMatrix(returns) {
  if (!returns || returns.length < 3) return null;
  const states = returns.map(r => r < -0.005 ? 0 : r > 0.005 ? 2 : 1);
  const m = [[1,1,1],[1,1,1],[1,1,1]];
  for (let i = 0; i < states.length - 1; i++) m[states[i]][states[i+1]]++;
  return m.map(row => { const s = row.reduce((a,b)=>a+b,0); return row.map(v=>v/s); });
}

/** GBM parameter estimation from price history */
function estimateGBM(prices) {
  if (!prices || prices.length < 2) return { mu: 0.08, sigma: 0.25, returns: [] };
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const r = Math.log(prices[i] / prices[i-1]);
    if (isFinite(r)) returns.push(r);
  }
  if (returns.length === 0) return { mu: 0.08, sigma: 0.25, returns: [] };
  const mean     = returns.reduce((a,b)=>a+b,0) / returns.length;
  const variance = returns.reduce((a,b)=>a+(b-mean)**2,0) / returns.length;
  const sigma    = Math.sqrt(variance * 252);
  return { mu: mean * 252, sigma: sigma > 0 ? sigma : 0.25, returns };
}

/** Value at Risk at given confidence */
function calcVaR(finals, S0, conf = 0.95) {
  if (!finals || finals.length === 0 || !S0) return 0;
  const pnl = finals.map(p => (p - S0) / S0 * 100).sort((a,b)=>a-b);
  return pnl[Math.floor((1 - conf) * pnl.length)] ?? 0;
}

/** Sharpe Ratio */
function calcSharpe(mu, sigma, rf = 0.05) {
  return sigma > 0 ? (mu - rf) / sigma : 0;
}

/** Percentile helper */
const pctile = (arr, p) => {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a,b)=>a-b);
  return s[Math.min(Math.floor(p * s.length / 100), s.length - 1)];
};

/** Compute full stats from finals */
function computeStats(finals, S0, gbm, adj) {
  if (!finals || finals.length === 0) return null;
  const sorted = [...finals].sort((a,b)=>a-b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean   = finals.reduce((a,b)=>a+b,0) / finals.length;
  const sigma  = gbm.sigma * (adj?.sigmaMultiplier || 1);
  return {
    probUp:      (finals.filter(f=>f>S0).length / finals.length) * 100,
    prob5up:     (finals.filter(f=>f>S0*1.05).length / finals.length) * 100,
    prob10up:    (finals.filter(f=>f>S0*1.10).length / finals.length) * 100,
    prob15up:    (finals.filter(f=>f>S0*1.15).length / finals.length) * 100,
    prob5down:   (finals.filter(f=>f<S0*0.95).length / finals.length) * 100,
    prob10down:  (finals.filter(f=>f<S0*0.90).length / finals.length) * 100,
    prob15down:  (finals.filter(f=>f<S0*0.85).length / finals.length) * 100,
    median,
    mean,
    p5:   pctile(finals, 5),
    p10:  pctile(finals, 10),
    p25:  pctile(finals, 25),
    p75:  pctile(finals, 75),
    p90:  pctile(finals, 90),
    p95:  pctile(finals, 95),
    var95:   calcVaR(finals, S0, 0.95),
    var99:   calcVaR(finals, S0, 0.99),
    sharpe:  calcSharpe(gbm.mu, sigma),
    expectedReturn: ((mean - S0) / S0) * 100,
    medianReturn:   ((median - S0) / S0) * 100,
    S0, adj, gbm, finals,
  };
}

// ─── SPARKLINE ───────────────────────────────────────────────────────────────
function Sparkline({ prices, change, width = 56, height = 22 }) {
  if (!prices || prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  const color = change >= 0 ? "var(--green)" : "var(--accent)";
  return (
    <svg width={width} height={height} className="ticker-spark" style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

// ─── CHART RENDERERS ─────────────────────────────────────────────────────────

/**
 * FIX: use ResizeObserver to wait for real layout width before drawing
 */
function useCanvasSize(ref, onReady) {
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current.parentElement;
    if (!el) return;
    // If already has width, fire immediately
    if (el.getBoundingClientRect().width > 0) {
      onReady();
      return;
    }
    // Otherwise observe until it does
    const ro = new ResizeObserver(() => {
      if (el.getBoundingClientRect().width > 0) {
        ro.disconnect();
        onReady();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  });
}

function drawMCChart(canvas, paths, days, S0) {
  if (!canvas || !paths || paths.length === 0) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W    = Math.max(rect.width, 300);
  canvas.width  = W * dpr;
  canvas.height = 340 * dpr;
  canvas.style.height = "340px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const H   = 340;
  const pad = { top: 20, right: 30, bottom: 40, left: 62 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0e1014";
  ctx.fillRect(0, 0, W, H);

  const allVals = paths.flat().filter(isFinite);
  if (allVals.length === 0) return;
  const minV = Math.min(...allVals) * 0.994;
  const maxV = Math.max(...allVals) * 1.006;
  const xS = i => pad.left + (i / days) * cW;
  const yS = v => pad.top + cH - ((v - minV) / (maxV - minV + 1e-9)) * cH;

  // Grid lines
  ctx.strokeStyle = "#1a1e27"; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y   = pad.top + (i / 5) * cH;
    const val = maxV - (i / 5) * (maxV - minV);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = "#3a4252"; ctx.font = "8px 'IBM Plex Mono'";
    ctx.textAlign = "right"; ctx.fillText("$" + val.toFixed(0), pad.left - 6, y + 3);
  }
  for (let i = 0; i <= 6; i++) {
    const x = pad.left + (i / 6) * cW;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + cH); ctx.stroke();
    ctx.fillStyle = "#3a4252"; ctx.textAlign = "center";
    ctx.fillText("D+" + Math.round((i / 6) * days), x, pad.top + cH + 14);
  }

  // Percentile shading bands
  [[5,95,"rgba(78,158,255,0.04)"],[25,75,"rgba(78,158,255,0.09)"]].forEach(([lo,hi,fill]) => {
    ctx.beginPath();
    for (let d = 0; d <= days; d++) {
      const vals = paths.map(p => p[d]).filter(isFinite);
      const hv   = pctile(vals, hi);
      d === 0 ? ctx.moveTo(xS(d), yS(hv)) : ctx.lineTo(xS(d), yS(hv));
    }
    for (let d = days; d >= 0; d--) {
      const vals = paths.map(p => p[d]).filter(isFinite);
      ctx.lineTo(xS(d), yS(pctile(vals, lo)));
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  });

  // Sampled paths (max 80)
  const step = Math.max(1, Math.ceil(paths.length / 80));
  paths.filter((_, i) => i % step === 0).forEach(path => {
    const color = path[path.length-1] > S0 ? "rgba(0,230,118,0.09)" : "rgba(255,68,34,0.09)";
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 0.8;
    path.forEach((v, i) => i === 0 ? ctx.moveTo(xS(i), yS(v)) : ctx.lineTo(xS(i), yS(v)));
    ctx.stroke();
  });

  // Median path
  ctx.beginPath(); ctx.strokeStyle = "#eceef4"; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]);
  for (let d = 0; d <= days; d++) {
    const vals = paths.map(p => p[d]).filter(isFinite).sort((a,b)=>a-b);
    const med  = vals[Math.floor(vals.length / 2)];
    d === 0 ? ctx.moveTo(xS(d), yS(med)) : ctx.lineTo(xS(d), yS(med));
  }
  ctx.stroke(); ctx.setLineDash([]);

  // S0 baseline
  ctx.beginPath(); ctx.strokeStyle = "rgba(245,200,66,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([2,4]);
  ctx.moveTo(pad.left, yS(S0)); ctx.lineTo(pad.left + cW, yS(S0));
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#f5c842"; ctx.font = "8px 'IBM Plex Mono'"; ctx.textAlign = "left";
  ctx.fillText("$" + S0.toFixed(0), pad.left + 4, yS(S0) - 5);
}

function drawDistChart(canvas, finals, S0) {
  if (!canvas || !finals || finals.length === 0) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W    = Math.max(rect.width, 200);
  canvas.width  = W * dpr;
  canvas.height = 180 * dpr;
  canvas.style.height = "180px";
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const H   = 180;
  const pad = { top:14, right:18, bottom:28, left:46 };
  ctx.clearRect(0,0,W,H); ctx.fillStyle="#0e1014"; ctx.fillRect(0,0,W,H);

  const sorted  = [...finals].filter(isFinite).sort((a,b)=>a-b);
  if (sorted.length === 0) return;
  const minV    = sorted[0] * 0.99;
  const maxV    = sorted[sorted.length-1] * 1.01;
  const bins    = 48;
  const binSize = (maxV - minV) / bins;
  const counts  = new Array(bins).fill(0);
  sorted.forEach(v => {
    const bi = Math.min(Math.floor((v - minV) / binSize), bins - 1);
    counts[bi]++;
  });
  const maxC = Math.max(...counts);
  const cW   = W - pad.left - pad.right;
  const cH   = H - pad.top  - pad.bottom;
  const xS   = v => pad.left + ((v - minV) / (maxV - minV + 1e-9)) * cW;
  const yS   = c => pad.top  + cH - (c / maxC) * cH;

  // Bars
  counts.forEach((c, i) => {
    const x  = pad.left + (i / bins) * cW;
    const bW = cW / bins - 0.5;
    const bc = minV + (i + 0.5) * binSize;
    ctx.fillStyle = bc > S0 ? "rgba(0,230,118,0.7)" : "rgba(255,68,34,0.65)";
    ctx.fillRect(x, yS(c), bW, cH - (yS(c) - pad.top));
  });

  // Axes
  ctx.strokeStyle = "#1a1e27"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top+cH);
  ctx.lineTo(pad.left+cW, pad.top+cH); ctx.stroke();

  // Labels
  [minV, S0, maxV].forEach(v => {
    ctx.fillStyle="#3a4252"; ctx.font="7px 'IBM Plex Mono'"; ctx.textAlign="center";
    ctx.fillText("$"+v.toFixed(0), xS(v), pad.top+cH+12);
  });

  // S0 line
  ctx.beginPath(); ctx.strokeStyle="#f5c842"; ctx.lineWidth=1.2; ctx.setLineDash([2,3]);
  ctx.moveTo(xS(S0), pad.top); ctx.lineTo(xS(S0), pad.top+cH); ctx.stroke(); ctx.setLineDash([]);

  // VaR line
  const var95x = pctile(finals, 5);
  ctx.beginPath(); ctx.strokeStyle="rgba(255,68,34,0.6)"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
  ctx.moveTo(xS(var95x), pad.top); ctx.lineTo(xS(var95x), pad.top+cH); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle="var(--accent)"; ctx.font="7px 'IBM Plex Mono'"; ctx.textAlign="center";
  ctx.fillText("VaR95", xS(var95x), pad.top+8);
}

/** NEW: draw a horizontal probability bar chart */
function drawProbBars(canvas, stats) {
  if (!canvas || !stats) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W    = Math.max(rect.width, 200);
  canvas.width  = W * dpr;
  canvas.height = 200 * dpr;
  canvas.style.height = "200px";
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const H   = 200;
  ctx.clearRect(0,0,W,H); ctx.fillStyle="#0e1014"; ctx.fillRect(0,0,W,H);

  const rows = [
    { label:"P(+15%)", val:stats.prob15up,  color:"#00e676" },
    { label:"P(+10%)", val:stats.prob10up,  color:"#00e676" },
    { label:"P(+5%)",  val:stats.prob5up,   color:"#4e9eff" },
    { label:"P(Up)",   val:stats.probUp,    color: stats.probUp>50?"#00e676":"#ff4422" },
    { label:"P(−5%)",  val:stats.prob5down, color:"#f5c842" },
    { label:"P(−10%)", val:stats.prob10down,color:"#ff4422" },
    { label:"P(−15%)", val:stats.prob15down,color:"#ff4422" },
  ];
  const rH   = H / rows.length;
  const labW = 52;
  const barW = W - labW - 50;

  rows.forEach(({ label, val, color }, i) => {
    const y = i * rH;
    // label
    ctx.fillStyle = "#6e7a8a"; ctx.font = "8px 'IBM Plex Mono'"; ctx.textAlign = "right";
    ctx.fillText(label, labW - 6, y + rH/2 + 3);
    // track
    ctx.fillStyle = "#1a1e27";
    ctx.fillRect(labW, y + rH*0.25, barW, rH*0.5);
    // fill
    const fw = (val / 100) * barW;
    ctx.fillStyle = color + "cc";
    ctx.fillRect(labW, y + rH*0.25, fw, rH*0.5);
    // value
    ctx.fillStyle = color; ctx.font = "9px 'IBM Plex Mono'"; ctx.textAlign = "left";
    ctx.fillText(fmt(val,1)+"%", labW + barW + 6, y + rH/2 + 3);
  });
}

// ─── API CALLS ────────────────────────────────────────────────────────────────
async function fetchStockData(symbol) {
  const url  = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=90&apikey=${TD_KEY}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  const prices = (data.values || []).map(v => parseFloat(v.close)).filter(isFinite).reverse();
  if (prices.length < 2) throw new Error("Not enough price data");
  const latest = prices[prices.length - 1];
  const prev   = prices[prices.length - 2];
  return { prices, latest, change: ((latest - prev) / prev) * 100 };
}

async function groqChat(prompt, maxTokens = 900) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", Authorization:`Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model:GROQ_MODEL, max_tokens:maxTokens, temperature:0.7,
      messages:[{ role:"user", content:prompt }] }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function fetchGeneratedNews(symbol) {
  const text = await groqChat(
    `Generate 8 realistic plausible recent news headlines (as of 2025) for ${symbol} stock. ` +
    `Return ONLY valid JSON array, no markdown:\n` +
    `[{"title":"...","source":"...","time":"Xh ago","sentiment":<-1 to 1>,"impact":<0 to 1>},...]`
  );
  try { return JSON.parse(text.replace(/```json|```/g,"").trim()); }
  catch { return []; }
}

async function analyzeNews(items, symbol) {
  const fallback = { sentiment:0, sentimentAdj:0, sigmaMultiplier:1, summary:"Unavailable.", keyFactors:[], direction:"NEUTRAL", confidence:50 };
  if (!items || items.length === 0) return fallback;
  const headlines = items.slice(0,6).map((n,i)=>`${i+1}. ${n.title}`).join("\n");
  try {
    const text = await groqChat(
      `You are a quantitative analyst. Analyze these news for ${symbol}. ` +
      `Return ONLY valid JSON, no markdown:\n` +
      `{"sentiment":<-1 to 1>,"sentimentAdj":<annualized drift float, e.g. 0.03>,"sigmaMultiplier":<0.8 to 1.5>,` +
      `"summary":"<2 sentences>","keyFactors":["<f1>","<f2>","<f3>"],"direction":"<BULLISH|BEARISH|NEUTRAL>","confidence":<0-100>}\n` +
      `Headlines:\n${headlines}`
    );
    const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
    // Validate / clamp
    parsed.sigmaMultiplier = Math.max(0.5, Math.min(2.5, parsed.sigmaMultiplier || 1));
    parsed.sentimentAdj    = Math.max(-0.5, Math.min(0.5, parsed.sentimentAdj || 0));
    return { ...fallback, ...parsed };
  } catch { return fallback; }
}

// ─── ENV BANNER ───────────────────────────────────────────────────────────────
function EnvBanner() {
  const missing = [];
  if (!TD_KEY)   missing.push("VITE_TWELVEDATA_KEY");
  if (!GROQ_KEY) missing.push("VITE_GROQ_KEY");
  if (!missing.length) return null;
  return (
    <div className="env-banner">
      <h3>⚠ MISSING ENVIRONMENT VARIABLES</h3>
      <p>
        The following keys are not set. Add them to your Vercel project under <strong>Settings → Environment Variables</strong>, then redeploy:<br/><br/>
        {missing.map(k => <span key={k}><code>{k}</code>&nbsp;</span>)}<br/><br/>
        See the <code>README.md</code> for full setup instructions.
      </p>
    </div>
  );
}

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(id); }, []);
  return <span className="nav-time">{t.toUTCString().slice(17,25)} UTC</span>;
}

// ─── PROB ARC SVG ─────────────────────────────────────────────────────────────
function ProbArc({ value, color, size = 110 }) {
  const r    = 42, cx = 56, cy = 56;
  const circ = 2 * Math.PI * r;
  const dash  = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 112 112">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1e27" strokeWidth="7"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition:"stroke-dasharray 1.2s ease" }}/>
      <text x={cx} y={cy+6} textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="IBM Plex Mono">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

// ─── PAGE: NEWS ───────────────────────────────────────────────────────────────
function NewsPage({ symbol, stockData }) {
  const [news, setNews]       = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setNews([]); setAnalysis(null);
    try {
      const items = await fetchGeneratedNews(symbol);
      setNews(items);
      const anal  = await analyzeNews(items, symbol);
      setAnalysis(anal);
    } catch(e) { console.error("NewsPage error:", e); }
    setLoading(false);
  }, [symbol]);

  useEffect(() => { load(); }, [load]);

  const sentColor  = s => s > 0.2 ? "var(--green)" : s < -0.2 ? "var(--accent)" : "var(--yellow)";
  const sentLabel  = s => s > 0.2 ? "BULLISH" : s < -0.2 ? "BEARISH" : "NEUTRAL";
  const sentTagCls = s => s > 0.2 ? "tag-bull" : s < -0.2 ? "tag-bear" : "tag-neutral";

  return (
    <div style={{ padding:"24px 36px", flex:1 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0, marginBottom:6 }}>NEWS INTELLIGENCE / {symbol}</div>
          <div style={{ fontSize:10, color:"var(--text2)" }}>AI-synthesized feed · sentiment via Groq LLaMA 3.3-70b</div>
        </div>
        <button className="btn btn-outline" onClick={load} disabled={loading}>
          {loading ? "LOADING…" : "↺  REFRESH"}
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
        {/* Feed */}
        <div className="card">
          <div className="section-label">LIVE FEED</div>
          {loading ? (
            <div className="loader" style={{ padding:"44px 0" }}>
              <div className="loader-dots"><span/><span/><span/></div>
              <span>Generating news via Groq…</span>
            </div>
          ) : (
            <div className="scroll-area">
              {news.map((item, i) => (
                <div className="news-item" key={i} style={{ animationDelay:`${i*0.05}s` }}>
                  <div className="news-meta">
                    <span className="news-source">{item.source?.toUpperCase()}</span>
                    <span style={{ color:"var(--border2)" }}>·</span>
                    <span className="news-time">{item.time}</span>
                    <span className={`tag ${sentTagCls(item.sentiment)}`} style={{ marginLeft:"auto" }}>{sentLabel(item.sentiment)}</span>
                  </div>
                  <div className="news-title">{item.title}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                    <span style={{ fontSize:8, color:"var(--text3)", width:48 }}>IMPACT</span>
                    <div className="impact-bar-wrap">
                      <div className="impact-bar" style={{ width:`${(item.impact||0.5)*100}%`, background:sentColor(item.sentiment) }}/>
                    </div>
                    <span style={{ fontSize:9, color:"var(--text2)", width:28 }}>{Math.round((item.impact||0.5)*100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card">
            <div className="section-label">AI VERDICT</div>
            {analysis ? (
              <>
                <div style={{ textAlign:"center", padding:"16px 0 12px" }}>
                  <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.02em",
                    color: analysis.direction==="BULLISH"?"var(--green)":analysis.direction==="BEARISH"?"var(--accent)":"var(--yellow)" }}>
                    {analysis.direction}
                  </div>
                  <div style={{ fontSize:10, color:"var(--text2)", marginTop:4 }}>{analysis.confidence}% confidence</div>
                  <div style={{ marginTop:10, height:3, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:`${analysis.confidence}%`, height:"100%", borderRadius:2,
                      background: analysis.direction==="BULLISH"?"var(--green)":analysis.direction==="BEARISH"?"var(--accent)":"var(--yellow)",
                      transition:"width 1s ease" }}/>
                  </div>
                </div>
                <div style={{ fontSize:11, color:"var(--text2)", lineHeight:1.7, marginBottom:14, fontFamily:"var(--sans)" }}>{analysis.summary}</div>
                <div className="section-label">KEY FACTORS</div>
                {(analysis.keyFactors||[]).map((f,i) => (
                  <div key={i} style={{ fontSize:9, color:"var(--text2)", padding:"5px 0", borderBottom:"1px solid var(--border)", display:"flex", gap:8 }}>
                    <span style={{ color:"var(--text3)" }}>{String(i+1).padStart(2,"0")}</span><span>{f}</span>
                  </div>
                ))}
              </>
            ) : <div className="loader"><div className="loader-dots"><span/><span/><span/></div></div>}
          </div>

          <div className="card">
            <div className="section-label">SENTIMENT METRICS</div>
            {analysis ? (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { label:"Sentiment Score",  value:fmt(analysis.sentiment,3),           color:sentColor(analysis.sentiment) },
                  { label:"Drift Adj (ann.)", value:fmtPct(analysis.sentimentAdj*100),   color:analysis.sentimentAdj>=0?"var(--green)":"var(--accent)" },
                  { label:"Vol Multiplier",   value:fmt(analysis.sigmaMultiplier,2)+"×", color:"var(--text)" },
                ].map(({label,value,color}) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:9, color:"var(--text2)" }}>{label}</span>
                    <span style={{ fontSize:11, fontWeight:700, color }}>{value}</span>
                  </div>
                ))}
              </div>
            ) : <div className="loader"><div className="loader-dots"><span/><span/><span/></div></div>}
          </div>

          {stockData && (
            <div className="card">
              <div className="section-label">PRICE</div>
              <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.02em" }}>${fmt(stockData.latest)}</div>
              <div style={{ fontSize:10, marginTop:4, color:colorChg(stockData.change) }}>{fmtPct(stockData.change)} today</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: SIMULATION ─────────────────────────────────────────────────────────
function SimulationPage({ symbol, stockData }) {
  const mcCanvasRef   = useRef(null);
  const distCanvasRef = useRef(null);
  const [paths, setPaths]   = useState(null);
  const [days, setDays]     = useState(30);
  const [gbm, setGbm]       = useState(null);
  const [markov, setMarkov] = useState(null);
  const [stats, setStats]   = useState(null);
  const [aiAdj, setAiAdj]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan]         = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (stockData?.prices?.length > 1) {
      const g = estimateGBM(stockData.prices);
      setGbm(g);
      setMarkov(buildMarkovMatrix(g.returns));
    }
  }, [stockData]);

  const runSim = useCallback(async () => {
    if (!gbm || !stockData) return;
    setLoading(true); setError(null);
    let adj = { sentimentAdj:0, sigmaMultiplier:1 };
    try {
      const news = await fetchGeneratedNews(symbol);
      adj = await analyzeNews(news, symbol);
      setAiAdj(adj);
    } catch(e) { console.warn("AI adj skipped:", e.message); }
    try {
      const S0    = stockData.latest;
      const sigma = gbm.sigma * (adj.sigmaMultiplier || 1);
      const newPaths = runMonteCarlo({ S0, mu:gbm.mu, sigma, days, n:600, sentimentAdj:adj.sentimentAdj||0 });
      if (newPaths.length === 0) throw new Error("Monte Carlo produced 0 paths — check GBM parameters.");
      setPaths(newPaths);
      const finals = newPaths.map(p=>p[p.length-1]);
      setStats(computeStats(finals, S0, gbm, adj));
      setRan(true);
    } catch(e) {
      console.error("Simulation error:", e);
      setError(e.message);
    }
    setLoading(false);
  }, [gbm, stockData, days, symbol]);

  // FIX: draw only after layout is ready via ResizeObserver
  useEffect(() => {
    if (!paths || !mcCanvasRef.current) return;
    const draw = () => drawMCChart(mcCanvasRef.current, paths, days, stockData.latest);
    const el   = mcCanvasRef.current.parentElement;
    if (el.getBoundingClientRect().width > 0) { draw(); return; }
    const ro = new ResizeObserver(() => { if (el.getBoundingClientRect().width > 0) { ro.disconnect(); draw(); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, [paths, days, stockData]);

  useEffect(() => {
    if (!stats || !distCanvasRef.current) return;
    const draw = () => drawDistChart(distCanvasRef.current, stats.finals, stats.S0);
    const el   = distCanvasRef.current.parentElement;
    if (el.getBoundingClientRect().width > 0) { draw(); return; }
    const ro = new ResizeObserver(() => { if (el.getBoundingClientRect().width > 0) { ro.disconnect(); draw(); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stats]);

  const stateLabels = ["BEAR","NEUTRAL","BULL"];
  const stateColors = ["var(--accent)","var(--yellow)","var(--green)"];

  return (
    <div style={{ padding:"24px 36px", flex:1 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0, marginBottom:6 }}>MONTE CARLO SIMULATION / {symbol}</div>
          <div style={{ fontSize:10, color:"var(--text2)" }}>GBM + Markov regime transitions + AI-adjusted drift &amp; volatility · 600 paths</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <span style={{ fontSize:8, color:"var(--text3)", marginRight:4 }}>HORIZON</span>
            {[7,14,30,60,90].map(d => (
              <button key={d} className="btn btn-outline" style={{ padding:"5px 10px", fontSize:"8px",
                background:days===d?"var(--surface2)":"transparent",
                color:days===d?"var(--text)":"var(--text3)",
                borderColor:days===d?"var(--border2)":"var(--border)" }}
                onClick={()=>setDays(d)}>{d}D</button>
            ))}
          </div>
          <button className="btn btn-accent" onClick={runSim} disabled={loading||!gbm}>
            {loading ? "RUNNING…" : ran ? "↺  RE-RUN" : "▶  RUN SIM"}
          </button>
        </div>
      </div>

      {/* GBM params */}
      {gbm && (
        <div className="grid-4" style={{ marginBottom:20 }}>
          {[
            { label:"Annualized Drift (μ)",  value:fmtPct(gbm.mu*100),              color:colorChg(gbm.mu) },
            { label:"Annualized Vol (σ)",    value:fmt(gbm.sigma*100,1)+"%",         color:"var(--text)" },
            { label:"Current Price",         value:"$"+fmt(stockData?.latest),       color:"var(--text)" },
            { label:"Sharpe Estimate",       value:fmt(calcSharpe(gbm.mu,gbm.sigma),2),
              color:calcSharpe(gbm.mu,gbm.sigma)>1?"var(--green)":calcSharpe(gbm.mu,gbm.sigma)>0?"var(--yellow)":"var(--accent)" },
          ].map(({label,value,color}) => (
            <div key={label} className="card card-sm">
              <div className="stat-label">{label}</div>
              <div style={{ fontSize:15, fontWeight:700, color, marginTop:4, fontVariantNumeric:"tabular-nums" }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding:"14px 20px", marginBottom:16, background:"rgba(255,68,34,0.07)", border:"1px solid rgba(255,68,34,0.2)", borderRadius:6, fontSize:10, color:"var(--accent)" }}>
          ⚠ {error}
        </div>
      )}

      {!ran && !loading && !error && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:260, border:"1px dashed var(--border)", borderRadius:8, color:"var(--text3)", fontSize:10, letterSpacing:"0.12em", flexDirection:"column", gap:10 }}>
          <span style={{ fontSize:20 }}>⟳</span>
          SELECT HORIZON AND PRESS RUN SIM
        </div>
      )}

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:260, border:"1px solid var(--border)", borderRadius:8, flexDirection:"column", gap:16 }}>
          <div className="loader-dots"><span/><span/><span/></div>
          <span style={{ fontSize:10, color:"var(--text3)" }}>Running 600 Monte Carlo paths + AI sentiment…</span>
        </div>
      )}

      {ran && !loading && paths && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <div className="card" style={{ padding:"14px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, flexWrap:"wrap", gap:8 }}>
              <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0 }}>PRICE PATHS — {days}D · 600 SIMULATIONS</div>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                {[["rgba(0,230,118,0.7)","Bull paths"],["rgba(255,68,34,0.7)","Bear paths"],["#eceef4","Median"],["rgba(78,158,255,0.5)","25–75%ile"]].map(([c,l])=>(
                  <div key={l} className="legend-item"><div className="legend-dot" style={{ background:c }}/>{l}</div>
                ))}
              </div>
            </div>
            <div className="chart-wrap"><canvas ref={mcCanvasRef}/></div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="section-label">DISTRIBUTION OF FINAL PRICES</div>
              <div className="chart-wrap"><canvas ref={distCanvasRef}/></div>
              <div style={{ display:"flex", gap:14, marginTop:10, flexWrap:"wrap" }}>
                <div className="legend-item"><div className="legend-dot" style={{ background:"var(--green)" }}/>Above entry</div>
                <div className="legend-item"><div className="legend-dot" style={{ background:"var(--accent)" }}/>Below entry</div>
                <div className="legend-item"><div className="legend-dot" style={{ background:"var(--yellow)" }}/>VaR 95%</div>
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {stats && (
                <div className="card">
                  <div className="section-label">STATISTICAL SUMMARY</div>
                  {[
                    { label:"P(Price Goes Up)",   value:fmt(stats.probUp,1)+"%",     color:stats.probUp>50?"var(--green)":"var(--accent)", big:true },
                    { label:"Median Target",       value:"$"+fmt(stats.median),       color:colorChg(stats.median-stats.S0) },
                    { label:"Expected Return",     value:fmtPct(stats.expectedReturn),color:colorChg(stats.expectedReturn) },
                    { label:"5th Percentile",      value:"$"+fmt(stats.p5),           color:"var(--accent)" },
                    { label:"25th Percentile",     value:"$"+fmt(stats.p25),          color:"var(--text2)" },
                    { label:"75th Percentile",     value:"$"+fmt(stats.p75),          color:"var(--text2)" },
                    { label:"95th Percentile",     value:"$"+fmt(stats.p95),          color:"var(--green)" },
                    { label:"VaR 95%",             value:fmt(stats.var95,1)+"%",      color:"var(--accent)" },
                    { label:"VaR 99%",             value:fmt(stats.var99,1)+"%",      color:"var(--accent)" },
                    { label:"Sharpe (est.)",        value:fmt(stats.sharpe,2),         color:stats.sharpe>1?"var(--green)":stats.sharpe>0?"var(--yellow)":"var(--accent)" },
                  ].map(({label,value,color,big}) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid var(--border)" }}>
                      <span style={{ fontSize:9, color:"var(--text2)" }}>{label}</span>
                      <span style={{ fontSize:big?16:11, fontWeight:big?800:600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {markov && (
                <div className="card">
                  <div className="section-label">MARKOV TRANSITION MATRIX</div>
                  <div style={{ fontSize:8, color:"var(--text3)", marginBottom:10 }}>Bear / Neutral / Bull regime probabilities</div>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <td style={{ fontSize:8, color:"var(--text3)", padding:"3px 6px" }}>FROM \ TO</td>
                        {stateLabels.map((l,j) => <th key={j} style={{ fontSize:8, fontWeight:700, color:stateColors[j], padding:"3px 6px", textAlign:"right" }}>{l}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {markov.map((row,i) => (
                        <tr key={i}>
                          <td style={{ fontSize:9, color:stateColors[i], padding:"5px 6px", fontWeight:700 }}>{stateLabels[i]}</td>
                          {row.map((v,j) => (
                            <td key={j} style={{ fontSize:10, color:i===j?"var(--text)":"var(--text2)", padding:"5px 6px", textAlign:"right", fontWeight:i===j?700:400 }}>
                              {fmt(v*100,1)}%
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {aiAdj && (
                <div className="card card-sm">
                  <div className="section-label">AI ADJUSTMENTS APPLIED</div>
                  <div style={{ fontSize:9, color:"var(--text2)", lineHeight:1.8 }}>
                    <div>Drift adj: <span style={{ color:aiAdj.sentimentAdj>=0?"var(--green)":"var(--accent)" }}>{aiAdj.sentimentAdj>=0?"+":""}{fmt(aiAdj.sentimentAdj*100,2)}%/yr</span></div>
                    <div>Vol adj: <span style={{ color:"var(--text)" }}>{fmt(aiAdj.sigmaMultiplier,2)}× baseline σ</span></div>
                    <div style={{ marginTop:8, color:"var(--text3)", fontFamily:"var(--sans)", fontSize:9 }}>{aiAdj.summary}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE: PROBABILITY ────────────────────────────────────────────────────────
function ProbabilityPage({ symbol, stockData }) {
  const probCanvasRef = useRef(null);
  const distCanvasRef = useRef(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState(30);
  const [error, setError]     = useState(null);

  const analyze = useCallback(async () => {
    if (!stockData) return;
    setLoading(true); setError(null); setResult(null);
    try {
      // Parallel: fetch news and estimate GBM simultaneously
      const [news, gbm] = await Promise.all([
        fetchGeneratedNews(symbol).catch(() => []),
        Promise.resolve(estimateGBM(stockData.prices)),
      ]);
      const adj   = await analyzeNews(news, symbol);
      const S0    = stockData.latest;
      const sigma = gbm.sigma * (adj.sigmaMultiplier || 1);

      if (!isFinite(S0) || S0 <= 0) throw new Error("Invalid stock price — try a different symbol.");
      if (!isFinite(sigma) || sigma <= 0) throw new Error("Could not estimate volatility from price history.");

      const paths = runMonteCarlo({ S0, mu:gbm.mu, sigma, days:horizon, n:1000, sentimentAdj:adj.sentimentAdj||0 });
      if (paths.length === 0) throw new Error("Simulation produced no paths.");

      const finals = paths.map(p => p[p.length-1]);
      setResult({ ...computeStats(finals, S0, gbm, adj), paths });
    } catch(e) {
      console.error("ProbabilityPage error:", e);
      setError(e.message || "Analysis failed. Check your API keys and symbol.");
    }
    setLoading(false);
  }, [symbol, stockData, horizon]);

  // Draw probability bar canvas
  useEffect(() => {
    if (!result || !probCanvasRef.current) return;
    const draw = () => drawProbBars(probCanvasRef.current, result);
    const el   = probCanvasRef.current.parentElement;
    if (el.getBoundingClientRect().width > 0) { draw(); return; }
    const ro = new ResizeObserver(() => { if (el.getBoundingClientRect().width > 0) { ro.disconnect(); draw(); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, [result]);

  // Draw distribution canvas
  useEffect(() => {
    if (!result || !distCanvasRef.current) return;
    const draw = () => drawDistChart(distCanvasRef.current, result.finals, result.S0);
    const el   = distCanvasRef.current.parentElement;
    if (el.getBoundingClientRect().width > 0) { draw(); return; }
    const ro = new ResizeObserver(() => { if (el.getBoundingClientRect().width > 0) { ro.disconnect(); draw(); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, [result]);

  const verdict = result
    ? result.probUp > 62 ? { text:"STRONG BUY",   color:"var(--green)" }
    : result.probUp > 54 ? { text:"MILD BULLISH", color:"var(--green)" }
    : result.probUp < 38 ? { text:"STRONG BEAR",  color:"var(--accent)" }
    : result.probUp < 46 ? { text:"MILD BEARISH", color:"var(--accent)" }
    :                      { text:"NEUTRAL",       color:"var(--yellow)" }
    : null;

  return (
    <div style={{ padding:"24px 36px", flex:1 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0, marginBottom:6 }}>PROBABILITY DASHBOARD / {symbol}</div>
          <div style={{ fontSize:10, color:"var(--text2)" }}>Full probabilistic forecast · 1000-path GBM + Markov + AI sentiment</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ display:"flex", gap:4 }}>
            <span style={{ fontSize:8, color:"var(--text3)", alignSelf:"center", marginRight:4 }}>HORIZON</span>
            {[7,14,30,60,90].map(d => (
              <button key={d} className="btn btn-outline" style={{ padding:"5px 10px", fontSize:"8px",
                background:horizon===d?"var(--surface2)":"transparent",
                color:horizon===d?"var(--text)":"var(--text3)",
                borderColor:horizon===d?"var(--border2)":"var(--border)" }}
                onClick={()=>setHorizon(d)}>{d}D</button>
            ))}
          </div>
          <button className="btn btn-accent" onClick={analyze} disabled={loading||!stockData}>
            {loading ? "ANALYZING…" : result ? "↺  RE-ANALYZE" : "▶  ANALYZE"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding:"14px 20px", marginBottom:16, background:"rgba(255,68,34,0.07)", border:"1px solid rgba(255,68,34,0.2)", borderRadius:6, fontSize:10, color:"var(--accent)" }}>
          ⚠ {error}
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:320, border:"1px dashed var(--border)", borderRadius:8, color:"var(--text3)", fontSize:10, letterSpacing:"0.12em", flexDirection:"column", gap:10 }}>
          <span style={{ fontSize:20 }}>◎</span>
          PRESS ANALYZE TO GENERATE FORECAST
        </div>
      )}

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:320, flexDirection:"column", gap:18, border:"1px solid var(--border)", borderRadius:8 }}>
          <div className="loader-dots"><span/><span/><span/></div>
          <span style={{ fontSize:10, color:"var(--text3)" }}>Running 1000-path Monte Carlo + AI sentiment analysis…</span>
        </div>
      )}

      {result && !loading && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

          {/* ── Verdict Banner ── */}
          <div className="card" style={{ padding:"24px 28px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0,
              background:`radial-gradient(ellipse at 75% 50%, ${result.probUp>50?"rgba(0,230,118,0.04)":"rgba(255,68,34,0.04)"} 0%, transparent 65%)`,
              pointerEvents:"none" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:32, flexWrap:"wrap" }}>
              <ProbArc value={result.probUp} color={result.probUp>50?"var(--green)":"var(--accent)"} size={120}/>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:8, letterSpacing:"0.2em", color:"var(--text3)", marginBottom:8 }}>OVERALL SIGNAL · {horizon}D HORIZON</div>
                <div style={{ fontSize:28, fontWeight:800, color:verdict.color, letterSpacing:"-0.03em", marginBottom:8 }}>{verdict.text}</div>
                <div style={{ fontSize:11, color:"var(--text2)", fontFamily:"var(--sans)", lineHeight:1.65, maxWidth:400 }}>
                  GBM + Markov regime + Groq AI sentiment —{" "}
                  <strong style={{ color:verdict.color }}>{Math.round(result.probUp)}% probability</strong>{" "}
                  {symbol} closes higher in {horizon} days.
                </div>
                <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
                  <span className={`tag tag-${result.adj?.direction==="BULLISH"?"bull":result.adj?.direction==="BEARISH"?"bear":"neutral"}`}>
                    NEWS: {result.adj?.direction}
                  </span>
                  <span style={{ fontSize:9, color:"var(--text3)", alignSelf:"center" }}>AI confidence: {result.adj?.confidence}%</span>
                  <span style={{ fontSize:9, color:"var(--text3)", alignSelf:"center" }}>Sharpe: {fmt(result.sharpe,2)}</span>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginLeft:"auto" }}>
                <div>
                  <div className="stat-label">MEDIAN TARGET</div>
                  <div style={{ fontSize:22, fontWeight:800, color:colorChg(result.median-result.S0), fontVariantNumeric:"tabular-nums" }}>${fmt(result.median)}</div>
                  <div style={{ fontSize:9, color:"var(--text3)", marginTop:2 }}>{fmtPct(result.medianReturn)}</div>
                </div>
                <div>
                  <div className="stat-label">EXPECTED RETURN</div>
                  <div style={{ fontSize:18, fontWeight:700, color:colorChg(result.expectedReturn), fontVariantNumeric:"tabular-nums" }}>{fmtPct(result.expectedReturn)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Prob Arcs Row ── */}
          <div className="grid-5">
            {[
              { label:"P(+15%)", value:result.prob15up,  color:"var(--green)" },
              { label:"P(+10%)", value:result.prob10up,  color:"var(--green)" },
              { label:"P(Up)",   value:result.probUp,    color:result.probUp>50?"var(--green)":"var(--accent)" },
              { label:"P(−10%)", value:result.prob10down,color:"var(--accent)" },
              { label:"P(−15%)", value:result.prob15down,color:"var(--accent)" },
            ].map(({label,value,color}) => (
              <div key={label} className="card" style={{ textAlign:"center", padding:"18px 8px" }}>
                <div className="prob-arc-wrap">
                  <ProbArc value={value} color={color} size={90}/>
                  <div style={{ fontSize:8, letterSpacing:"0.12em", color:"var(--text3)" }}>{label}</div>
                  <div style={{ fontSize:8, color:"var(--text3)" }}>in {horizon}d</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Probability Bar Chart + Distribution ── */}
          <div className="grid-2">
            <div className="card">
              <div className="section-label">PROBABILITY PROFILE</div>
              <div className="chart-wrap"><canvas ref={probCanvasRef}/></div>
            </div>
            <div className="card">
              <div className="section-label">FINAL PRICE DISTRIBUTION · 1000 PATHS</div>
              <div className="chart-wrap"><canvas ref={distCanvasRef}/></div>
              <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
                <div className="legend-item"><div className="legend-dot" style={{ background:"var(--green)" }}/>Above entry</div>
                <div className="legend-item"><div className="legend-dot" style={{ background:"var(--accent)" }}/>Below entry</div>
                <div className="legend-item"><div className="legend-dot" style={{ background:"var(--yellow)" }}/>VaR 95%</div>
              </div>
            </div>
          </div>

          {/* ── Risk Metrics + Percentile Table ── */}
          <div className="grid-2">
            <div className="card">
              <div className="section-label">RISK METRICS</div>
              {[
                { label:"VaR 95% (worst case)",  value:fmt(result.var95,1)+"%",                          color:"var(--accent)" },
                { label:"VaR 99% (tail risk)",   value:fmt(result.var99,1)+"%",                          color:"var(--accent)" },
                { label:"Annualized Vol (σ)",     value:fmt(result.gbm?.sigma*100,1)+"%",                 color:"var(--text)" },
                { label:"Annualized Drift (μ)",   value:fmtPct(result.gbm?.mu*100),                      color:colorChg(result.gbm?.mu) },
                { label:"AI Drift Adjustment",    value:(result.adj?.sentimentAdj>=0?"+":"")+fmt(result.adj?.sentimentAdj*100,2)+"%/yr", color:colorChg(result.adj?.sentimentAdj) },
                { label:"Vol Multiplier (AI)",    value:fmt(result.adj?.sigmaMultiplier,2)+"×",           color:"var(--text)" },
                { label:"Sharpe Ratio (est.)",    value:fmt(result.sharpe,2),                             color:result.sharpe>1?"var(--green)":result.sharpe>0?"var(--yellow)":"var(--accent)" },
              ].map(({label,value,color}) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:9, color:"var(--text2)" }}>{label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-label">PERCENTILE FORECAST TABLE</div>
              <div style={{ fontSize:8, color:"var(--text3)", marginBottom:12 }}>Final price distribution over {horizon}D horizon</div>
              {[
                { pct:"5th",  price:result.p5,  pnl:((result.p5 -result.S0)/result.S0)*100, color:"var(--accent)" },
                { pct:"10th", price:result.p10, pnl:((result.p10-result.S0)/result.S0)*100, color:"var(--accent)" },
                { pct:"25th", price:result.p25, pnl:((result.p25-result.S0)/result.S0)*100, color:"var(--text2)" },
                { pct:"50th", price:result.median, pnl:result.medianReturn,                  color:"var(--text)" },
                { pct:"75th", price:result.p75, pnl:((result.p75-result.S0)/result.S0)*100, color:"var(--text2)" },
                { pct:"90th", price:result.p90, pnl:((result.p90-result.S0)/result.S0)*100, color:"var(--green)" },
                { pct:"95th", price:result.p95, pnl:((result.p95-result.S0)/result.S0)*100, color:"var(--green)" },
              ].map(({pct,price,pnl,color}) => (
                <div key={pct} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:9, color:"var(--text3)", width:36 }}>{pct}</span>
                  <div style={{ flex:1, margin:"0 12px" }}>
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{ width:`${Math.min(100,Math.max(0,((price-result.p5)/(result.p95-result.p5+1e-9))*100))}%`, background:color+"99" }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color, width:60, textAlign:"right" }}>${fmt(price)}</span>
                  <span style={{ fontSize:9, color, width:52, textAlign:"right" }}>{fmtPct(pnl)}</span>
                </div>
              ))}
              <div style={{ marginTop:12, padding:"8px 0", display:"flex", justifyContent:"space-between", borderTop:"1px solid var(--border2)" }}>
                <span style={{ fontSize:8, color:"var(--text3)" }}>ENTRY PRICE</span>
                <span style={{ fontSize:10, fontWeight:700, color:"var(--yellow)" }}>${fmt(result.S0)}</span>
              </div>
            </div>
          </div>

          {/* ── Methodology ── */}
          <div className="card">
            <div className="section-label">METHODOLOGY</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
              {[
                { name:"Geometric Brownian Motion", desc:"dS = μS dt + σS dW — stochastic process with drift & vol calibrated from 90-day historical log-returns." },
                { name:"Markov Chain (3-state)",    desc:"Bear/Neutral/Bull transition matrix from return sign sequences; captures regime persistence and clustering." },
                { name:"Monte Carlo (1000 paths)",  desc:"1000 GBM sims with AI-adjusted parameters. P(up) = fraction of paths ending above entry price." },
                { name:"Groq LLM Sentiment",        desc:"LLaMA 3.3-70b synthesizes 8 headlines → sentiment score → drift adjustment + vol multiplier fed into GBM." },
                { name:"VaR 95% / VaR 99%",         desc:"Value at Risk = Nth-percentile worst-case loss from 1000-path final price distribution." },
                { name:"Sharpe Ratio",              desc:"Sharpe = (μ − r_f) / σ, using risk-free rate r_f = 5%. Measures return per unit of risk." },
              ].map(({name,desc}) => (
                <div key={name} style={{ padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"var(--text)", marginBottom:3 }}>{name}</div>
                  <div style={{ fontSize:9, color:"var(--text3)", lineHeight:1.65, fontFamily:"var(--sans)" }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE: PORTFOLIO / WATCHLIST ──────────────────────────────────────────────
function PortfolioPage({ watchlist, setWatchlist, allQuotes }) {
  const [newSym, setNewSym]   = useState("");
  const [adding, setAdding]   = useState(false);
  const [sortBy, setSortBy]   = useState("change");
  const [sortDir, setSortDir] = useState(-1);
  const [runningAll, setRunningAll] = useState(false);
  const [mcResults, setMcResults]   = useState({});

  const handleAdd = () => {
    const sym = newSym.toUpperCase().trim();
    if (sym && !watchlist.includes(sym)) setWatchlist(prev => [...prev, sym]);
    setNewSym(""); setAdding(false);
  };
  const handleRemove = (sym) => setWatchlist(prev => prev.filter(s => s !== sym));
  const handleSort   = (col) => {
    if (sortBy === col) setSortDir(d => -d);
    else { setSortBy(col); setSortDir(-1); }
  };

  const runAllSims = async () => {
    setRunningAll(true);
    const results = {};
    for (const sym of watchlist) {
      const q = allQuotes[sym];
      if (!q?.prices || q.prices.length < 2) continue;
      try {
        const gbm   = estimateGBM(q.prices);
        const paths = runMonteCarlo({ S0:q.latest, mu:gbm.mu, sigma:gbm.sigma, days:30, n:300 });
        if (paths.length === 0) continue;
        const finals = paths.map(p=>p[p.length-1]);
        const sorted = [...finals].sort((a,b)=>a-b);
        results[sym] = {
          probUp: (finals.filter(f=>f>q.latest).length/finals.length)*100,
          median: sorted[Math.floor(sorted.length/2)],
          var95:  calcVaR(finals,q.latest,0.95),
          sharpe: calcSharpe(gbm.mu,gbm.sigma),
          mu:     gbm.mu, sigma: gbm.sigma,
        };
      } catch {}
    }
    setMcResults(results); setRunningAll(false);
  };

  const rows = watchlist.map(sym => {
    const q  = allQuotes[sym];
    const mc = mcResults[sym];
    return { sym, price:q?.latest, change:q?.change, prices:q?.prices, ...mc };
  }).sort((a,b) => {
    const av = a[sortBy] ?? -Infinity, bv = b[sortBy] ?? -Infinity;
    return (av - bv) * sortDir;
  });

  const thStyle = (col) => ({ cursor:"pointer", color:sortBy===col?"var(--text2)":undefined, userSelect:"none" });
  const arrow   = (col) => sortBy===col ? (sortDir>0?" ↑":" ↓") : "";

  return (
    <div style={{ padding:"24px 36px", flex:1 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0, marginBottom:6 }}>WATCHLIST / PORTFOLIO VIEW</div>
          <div style={{ fontSize:10, color:"var(--text2)" }}>Track symbols · run batch MC analysis · compare risk metrics</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-outline" onClick={()=>setAdding(a=>!a)}>+ ADD SYMBOL</button>
          <button className="btn btn-accent" onClick={runAllSims} disabled={runningAll}>
            {runningAll ? "RUNNING…" : "▶  RUN ALL SIMS (30D)"}
          </button>
        </div>
      </div>

      {adding && (
        <div style={{ marginBottom:18, display:"flex", gap:8, alignItems:"center" }}>
          <input className="input" style={{ maxWidth:180 }} placeholder="e.g. GOOGL" value={newSym}
            onChange={e=>setNewSym(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&handleAdd()} autoFocus/>
          <button className="btn btn-primary" onClick={handleAdd}>ADD</button>
          <button className="btn btn-ghost"   onClick={()=>setAdding(false)}>CANCEL</button>
        </div>
      )}

      <div className="card" style={{ padding:0, overflow:"hidden" }}>
        <table className="port-table">
          <thead>
            <tr>
              <th style={{ textAlign:"left", paddingLeft:20 }}>SYMBOL</th>
              <th onClick={()=>handleSort("price")}  style={thStyle("price")}>PRICE{arrow("price")}</th>
              <th onClick={()=>handleSort("change")} style={thStyle("change")}>CHG %{arrow("change")}</th>
              <th onClick={()=>handleSort("probUp")} style={thStyle("probUp")}>P(UP) 30D{arrow("probUp")}</th>
              <th onClick={()=>handleSort("median")} style={thStyle("median")}>MEDIAN{arrow("median")}</th>
              <th onClick={()=>handleSort("var95")}  style={thStyle("var95")}>VAR 95%{arrow("var95")}</th>
              <th onClick={()=>handleSort("sharpe")} style={thStyle("sharpe")}>SHARPE{arrow("sharpe")}</th>
              <th onClick={()=>handleSort("sigma")}  style={thStyle("sigma")}>VOL (σ){arrow("sigma")}</th>
              <th>SPARK</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.sym}>
                <td style={{ textAlign:"left", paddingLeft:20, fontWeight:700, fontSize:12 }}>{row.sym}</td>
                <td>{row.price!=null ? "$"+fmt(row.price) : <span style={{ color:"var(--text3)" }}>—</span>}</td>
                <td style={{ color:colorChg(row.change??0) }}>{row.change!=null ? fmtPct(row.change) : "—"}</td>
                <td style={{ color:row.probUp!=null?(row.probUp>50?"var(--green)":"var(--accent)"):"var(--text3)" }}>
                  {row.probUp!=null ? fmt(row.probUp,1)+"%" : <span style={{ color:"var(--text3)" }}>—</span>}
                </td>
                <td style={{ color:row.median!=null?colorChg((row.median??0)-(row.price??0)):"var(--text3)" }}>
                  {row.median!=null ? "$"+fmt(row.median) : "—"}
                </td>
                <td style={{ color:"var(--accent)" }}>{row.var95!=null ? fmt(row.var95,1)+"%" : "—"}</td>
                <td style={{ color:row.sharpe!=null?(row.sharpe>1?"var(--green)":row.sharpe>0?"var(--yellow)":"var(--accent)"):"var(--text3)" }}>
                  {row.sharpe!=null ? fmt(row.sharpe,2) : "—"}
                </td>
                <td style={{ color:"var(--text2)" }}>{row.sigma!=null ? fmt(row.sigma*100,1)+"%" : "—"}</td>
                <td>
                  {row.prices?.length>1 && (
                    <Sparkline prices={row.prices.slice(-20)} change={row.change??0} width={50} height={18}/>
                  )}
                </td>
                <td>
                  {!DEFAULT_WATCHLIST.includes(row.sym) && (
                    <button className="btn btn-ghost" style={{ fontSize:"9px", padding:"3px 8px", color:"var(--text3)" }}
                      onClick={()=>handleRemove(row.sym)}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Object.keys(mcResults).length > 0 && (
        <div style={{ marginTop:14, fontSize:9, color:"var(--text3)" }}>
          * MC results use 300-path simulation without AI sentiment for speed. Run full analysis per symbol for precise figures.
        </div>
      )}
    </div>
  );
}

// ─── TICKER BAR ───────────────────────────────────────────────────────────────
function TickerBar({ quotes, watchlist, selected, onSelect }) {
  return (
    <div className="ticker-bar">
      {watchlist.map(sym => {
        const q   = quotes[sym];
        const chg = q?.change ?? 0;
        return (
          <div key={sym} className={`ticker-item${selected===sym?" selected":""}`} onClick={()=>onSelect(sym)}>
            <span className="ticker-sym">{sym}</span>
            <span className="ticker-price">{q ? "$"+fmt(q.latest) : "…"}</span>
            <span className={`ticker-chg ${classChg(chg)}`}>{q ? fmtPct(chg) : "—"}</span>
            {q?.prices && <Sparkline prices={q.prices.slice(-20)} change={chg} width={44} height={18}/>}
          </div>
        );
      })}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]           = useState("news");
  const [symbol, setSymbol]       = useState("AAPL");
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [allQuotes, setAllQuotes] = useState({});
  const [stockData, setStockData] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const keysOk = TD_KEY && GROQ_KEY;

  const loadStock = useCallback(async (sym) => {
    if (!TD_KEY) return;
    setLoadingStock(true); setStockData(null);
    try {
      const data = await fetchStockData(sym);
      setStockData(data);
      setAllQuotes(q => ({ ...q, [sym]: data }));
    } catch(e) { console.error("loadStock error:", e); }
    setLoadingStock(false);
  }, []);

  // Load all watchlist quotes in the background
  useEffect(() => {
    if (!TD_KEY) return;
    watchlist.forEach(sym => {
      fetchStockData(sym)
        .then(data => setAllQuotes(q => ({ ...q, [sym]: data })))
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join(",")]);

  useEffect(() => { loadStock(symbol); }, [symbol, loadStock]);

  const handleSelectSymbol = useCallback((sym) => {
    setSymbol(sym);
    setPage("news");
  }, []);

  useEffect(() => {
    watchlist.forEach(sym => {
      if (!allQuotes[sym]) {
        fetchStockData(sym)
          .then(data => setAllQuotes(q => ({ ...q, [sym]: data })))
          .catch(() => {});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist]);

  const PAGES = [
    { id:"news",        label:"NEWS" },
    { id:"simulation",  label:"SIMULATION" },
    { id:"probability", label:"PROBABILITY" },
    { id:"portfolio",   label:"WATCHLIST" },
  ];

  return (
    <>
      <GlobalStyle/>
      <div className="page">
        {/* Nav */}
        <div className="nav">
          <div className="nav-brand">
            <span className="nav-logo">STOCKPROB</span>
            <span className="nav-version">PROBABILITY ENGINE v2.1</span>
          </div>
          <div className="nav-tabs">
            {PAGES.map(p => (
              <button key={p.id} className={`nav-tab${page===p.id?" active":""}`} onClick={()=>setPage(p.id)}>{p.label}</button>
            ))}
          </div>
          <div className="nav-right">
            <div className="live-pill"><div className="live-dot"/>LIVE</div>
            <Clock/>
          </div>
        </div>

        {!keysOk && <EnvBanner/>}

        <TickerBar quotes={allQuotes} watchlist={watchlist} selected={symbol} onSelect={handleSelectSymbol}/>

        {loadingStock && (
          <div style={{ padding:"7px 36px", background:"var(--surface)", borderBottom:"1px solid var(--border)", display:"flex", gap:8, alignItems:"center" }}>
            <div className="loader-dots"><span/><span/><span/></div>
            <span style={{ fontSize:9, color:"var(--text3)" }}>Fetching {symbol} · Twelve Data API…</span>
          </div>
        )}

        <div className="slide-in" key={page+symbol}>
          {page === "news"        && <NewsPage        symbol={symbol} stockData={stockData}/>}
          {page === "simulation"  && <SimulationPage  symbol={symbol} stockData={stockData}/>}
          {page === "probability" && <ProbabilityPage symbol={symbol} stockData={stockData}/>}
          {page === "portfolio"   && <PortfolioPage   watchlist={watchlist} setWatchlist={setWatchlist} allQuotes={allQuotes}/>}
        </div>
      </div>
    </>
  );
}
