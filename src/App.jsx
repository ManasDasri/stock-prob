import { useState, useEffect, useRef, useCallback } from "react";

// ─── ENV VARS ─────────────────────────────────────────────────────────────────
const TD_KEY      = import.meta.env.VITE_TWELVEDATA_KEY ?? "";
const GROQ_KEY    = import.meta.env.VITE_GROQ_KEY       ?? "";
const FH_KEY      = import.meta.env.VITE_FINNHUB_KEY    ?? "";
const GROQ_MODEL  = "llama-3.3-70b-versatile";

// ─── STOCK UNIVERSE ──────────────────────────────────────────────────────────
const US_STOCKS = [
  { sym:"AAPL",  name:"Apple Inc.",           sector:"Tech" },
  { sym:"TSLA",  name:"Tesla Inc.",            sector:"Auto" },
  { sym:"NVDA",  name:"NVIDIA Corp.",          sector:"Semis" },
  { sym:"MSFT",  name:"Microsoft Corp.",       sector:"Tech" },
  { sym:"META",  name:"Meta Platforms",        sector:"Tech" },
  { sym:"AMZN",  name:"Amazon.com Inc.",       sector:"Retail" },
  { sym:"GOOGL", name:"Alphabet Inc.",         sector:"Tech" },
  { sym:"NFLX",  name:"Netflix Inc.",          sector:"Media" },
  { sym:"AMD",   name:"Advanced Micro Devices",sector:"Semis" },
  { sym:"UBER",  name:"Uber Technologies",     sector:"Transport" },
  { sym:"PLTR",  name:"Palantir Technologies", sector:"AI" },
  { sym:"COIN",  name:"Coinbase Global",       sector:"Crypto" },
  { sym:"JPM",   name:"JPMorgan Chase",        sector:"Finance" },
  { sym:"GS",    name:"Goldman Sachs",         sector:"Finance" },
  { sym:"SPY",   name:"S&P 500 ETF",           sector:"ETF" },
  { sym:"QQQ",   name:"Nasdaq 100 ETF",        sector:"ETF" },
];

// Indian stocks use NSE exchange suffix for TwelveData
const IN_STOCKS = [
  { sym:"RELIANCE:NSE",  display:"RELIANCE",  name:"Reliance Industries",    sector:"Energy" },
  { sym:"TCS:NSE",       display:"TCS",        name:"Tata Consultancy Svcs.", sector:"IT" },
  { sym:"INFY:NSE",      display:"INFY",       name:"Infosys Ltd.",           sector:"IT" },
  { sym:"HDFCBANK:NSE",  display:"HDFCBANK",   name:"HDFC Bank Ltd.",         sector:"Finance" },
  { sym:"ICICIBANK:NSE", display:"ICICIBANK",  name:"ICICI Bank Ltd.",        sector:"Finance" },
  { sym:"WIPRO:NSE",     display:"WIPRO",      name:"Wipro Ltd.",             sector:"IT" },
  { sym:"BAJFINANCE:NSE",display:"BAJFINANCE", name:"Bajaj Finance",          sector:"Finance" },
  { sym:"HINDUNILVR:NSE",display:"HUL",        name:"Hindustan Unilever",     sector:"FMCG" },
  { sym:"ITC:NSE",       display:"ITC",        name:"ITC Ltd.",               sector:"FMCG" },
  { sym:"TATAMOTORS:NSE",display:"TATAMOTORS", name:"Tata Motors Ltd.",       sector:"Auto" },
  { sym:"ADANIENT:NSE",  display:"ADANIENT",   name:"Adani Enterprises",      sector:"Conglomerate" },
  { sym:"SBIN:NSE",      display:"SBIN",       name:"State Bank of India",    sector:"Finance" },
  { sym:"MARUTI:NSE",    display:"MARUTI",     name:"Maruti Suzuki India",    sector:"Auto" },
  { sym:"NIFTY50:NSE",   display:"NIFTY50",    name:"Nifty 50 Index",         sector:"Index" },
  { sym:"SENSEX:BSE",    display:"SENSEX",     name:"BSE Sensex Index",       sector:"Index" },
];

const ALL_STOCKS = [...US_STOCKS.map(s => ({ ...s, display:s.sym, exchange:"US" })),
                   ...IN_STOCKS.map(s => ({ ...s, exchange:"IN" }))];

const DEFAULT_WATCHLIST = ["AAPL","TSLA","NVDA","RELIANCE:NSE","TCS:NSE","INFY:NSE"];

const getDisplay = (sym) => {
  const s = ALL_STOCKS.find(s => s.sym === sym);
  return s?.display || sym.split(":")[0];
};
const getName = (sym) => {
  const s = ALL_STOCKS.find(s => s.sym === sym);
  return s?.name || sym;
};
const getCurrency = (sym) => sym.includes(":NSE") || sym.includes(":BSE") ? "₹" : "$";

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #F5F0E8;
      --surface:  #EDE8DE;
      --surface2: #E0D9CC;
      --border:   #C8BFA8;
      --border2:  #B0A490;
      --text:     #0D0C0A;
      --text2:    #4A4438;
      --text3:    #8A8070;
      --accent:   #1A1410;
      --red:      #C0392B;
      --green:    #1D7A4A;
      --yellow:   #C9960A;
      --blue:     #1A3A6B;
      --invert:   #0D0C0A;
      --invert-text: #F5F0E8;
      --mono:     'Space Mono', monospace;
      --sans:     'Space Grotesk', sans-serif;
    }

    html, body { height: 100%; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--mono);
      overflow-x: hidden;
      min-height: 100vh;
    }

    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: var(--surface); }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

    .page { min-height: 100vh; display: flex; flex-direction: column; }

    /* ── Nav ── */
    .nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 36px; height: 56px; border-bottom: 1.5px solid var(--accent);
      position: sticky; top: 0; z-index: 100;
      background: var(--bg);
    }
    .nav-brand { display: flex; align-items: center; gap: 14px; }
    .nav-logo { font-family: var(--mono); font-size: 13px; font-weight: 700; letter-spacing: 0.22em; color: var(--text); }
    .nav-version { font-size: 7px; color: var(--text3); letter-spacing: 0.18em; font-family: var(--mono); border: 1px solid var(--border); padding: 2px 6px; }
    .nav-tabs { display: flex; gap: 0; border: 1.5px solid var(--accent); }
    .nav-tab {
      padding: 8px 18px; font-size: 8px; font-family: var(--mono); font-weight: 700;
      letter-spacing: 0.18em; cursor: pointer; transition: all 0.12s;
      color: var(--text3); background: transparent; border: none; text-transform: uppercase;
      border-right: 1px solid var(--border);
    }
    .nav-tab:last-child { border-right: none; }
    .nav-tab:hover { background: var(--surface2); color: var(--text); }
    .nav-tab.active { background: var(--invert); color: var(--invert-text); }
    .nav-right { display: flex; align-items: center; gap: 16px; }
    .live-pill {
      display: flex; align-items: center; gap: 6px;
      border: 1px solid var(--green); padding: 4px 10px;
      font-size: 7px; letter-spacing: 0.18em; color: var(--green); font-family: var(--mono);
    }
    .live-dot { width: 5px; height: 5px; background: var(--green); animation: blink 1.4s step-end infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .nav-time { font-size: 9px; color: var(--text3); letter-spacing: 0.1em; font-family: var(--mono); font-variant-numeric: tabular-nums; }

    /* ── Ticker Bar ── */
    .ticker-bar {
      display: flex; overflow-x: auto; border-bottom: 1.5px solid var(--accent);
      background: var(--invert); scrollbar-width: none;
    }
    .ticker-bar::-webkit-scrollbar { display: none; }
    .ticker-item {
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
      padding: 7px 18px; font-size: 9px; letter-spacing: 0.06em;
      border-right: 1px solid rgba(245,240,232,0.1); white-space: nowrap; cursor: pointer;
      transition: background 0.1s; position: relative; color: var(--invert-text);
    }
    .ticker-item:hover { background: rgba(255,255,255,0.06); }
    .ticker-item.selected { background: rgba(255,255,255,0.1); }
    .ticker-item.selected::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
      background: var(--bg);
    }
    .ticker-sym { font-weight: 700; font-size: 10px; }
    .ticker-price { color: rgba(245,240,232,0.6); font-variant-numeric: tabular-nums; }
    .ticker-chg.up   { color: #4ECC88; }
    .ticker-chg.down { color: #E05555; }
    .ticker-chg.flat { color: rgba(245,240,232,0.4); }
    .ticker-ex { font-size: 7px; color: rgba(245,240,232,0.3); letter-spacing: 0.1em; }

    /* ── Section label ── */
    .section-label {
      font-size: 7px; letter-spacing: 0.28em; color: var(--text3); font-weight: 700;
      text-transform: uppercase; padding-bottom: 10px; border-bottom: 1px solid var(--border);
      margin-bottom: 16px; font-family: var(--mono);
    }

    /* ── Cards ── */
    .card { background: var(--surface); border: 1px solid var(--border); padding: 20px; }
    .card-dark { background: var(--invert); border: 1.5px solid var(--accent); color: var(--invert-text); }
    .card-sm { padding: 12px 16px; }

    /* ── Buttons ── */
    .btn {
      font-family: var(--mono); font-size: 8px; font-weight: 700;
      letter-spacing: 0.18em; text-transform: uppercase;
      padding: 9px 18px; cursor: pointer;
      transition: all 0.12s; border: 1.5px solid transparent;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .btn-primary { background: var(--invert); color: var(--invert-text); border-color: var(--invert); }
    .btn-primary:not(:disabled):hover { background: transparent; color: var(--text); border-color: var(--text); }
    .btn-outline { background: transparent; color: var(--text2); border-color: var(--border); }
    .btn-outline:not(:disabled):hover { color: var(--text); border-color: var(--text); }
    .btn-accent { background: var(--red); color: white; border-color: var(--red); }
    .btn-accent:not(:disabled):hover { background: transparent; color: var(--red); }
    .btn-ghost { background: transparent; color: var(--text3); border-color: transparent; padding: 6px 10px; }
    .btn-ghost:not(:disabled):hover { color: var(--text2); background: var(--surface2); }

    /* ── Input ── */
    .input {
      background: var(--bg); border: 1.5px solid var(--border);
      color: var(--text); font-family: var(--mono); font-size: 10px;
      padding: 9px 13px; outline: none; width: 100%;
      transition: border-color 0.12s;
    }
    .input:focus { border-color: var(--text); }
    .input::placeholder { color: var(--text3); }

    /* ── Tags ── */
    .tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; font-size: 7px;
      font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
      border: 1px solid;
    }
    .tag-bull    { color: var(--green);  border-color: var(--green);  background: rgba(29,122,74,0.08); }
    .tag-bear    { color: var(--red);    border-color: var(--red);    background: rgba(192,57,43,0.08); }
    .tag-neutral { color: var(--yellow); border-color: var(--yellow); background: rgba(201,150,10,0.08); }
    .tag-in      { color: var(--blue);   border-color: var(--blue);   background: rgba(26,58,107,0.08); }

    /* ── News ── */
    .news-item { padding: 14px 0; border-bottom: 1px solid var(--border); animation: fadeUp 0.3s ease-out both; }
    .news-item:last-child { border-bottom: none; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
    .news-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; flex-wrap: wrap; }
    .news-source { font-size: 7px; color: var(--text3); letter-spacing: 0.16em; text-transform: uppercase; font-family: var(--mono); }
    .news-time   { font-size: 7px; color: var(--text3); font-family: var(--mono); }
    .news-title  { font-size: 13px; color: var(--text); line-height: 1.6; font-family: var(--sans); font-weight: 400; }

    /* ── Streaming text ── */
    @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
    .cursor { display:inline-block; width:7px; height:1em; background:var(--text); vertical-align:text-bottom; animation: cursorBlink 0.7s step-end infinite; margin-left:1px; }

    /* ── Charts ── */
    .chart-wrap { position: relative; width: 100%; }
    canvas { display: block; width: 100% !important; }

    /* ── Grid ── */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

    /* ── Stat ── */
    .stat-label { font-size: 7px; color: var(--text3); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 5px; font-family: var(--mono); }
    .stat-value { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; color: var(--text); font-variant-numeric: tabular-nums; font-family: var(--mono); }
    .stat-sub   { font-size: 9px; color: var(--text2); margin-top: 3px; font-family: var(--mono); }

    /* ── Loader ── */
    .loader { display: flex; align-items: center; gap: 8px; color: var(--text3); font-size: 10px; font-family: var(--mono); }
    .loader-dots span { display: inline-block; width: 3px; height: 3px; background: var(--text3); margin: 0 2px; animation: dotBounce 1s ease-in-out infinite; }
    .loader-dots span:nth-child(2) { animation-delay: 0.16s; }
    .loader-dots span:nth-child(3) { animation-delay: 0.32s; }
    @keyframes dotBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }

    /* ── Env Banner ── */
    .env-banner {
      background: rgba(201,150,10,0.06); border: 1px solid rgba(201,150,10,0.3);
      padding: 18px 24px; margin: 20px 36px;
    }
    .env-banner h3 { font-size: 10px; color: var(--yellow); margin-bottom: 8px; letter-spacing: 0.12em; font-family: var(--mono); }
    .env-banner p  { font-size: 10px; color: var(--text2); line-height: 1.8; font-family: var(--mono); }
    .env-banner code { background: var(--surface2); padding: 1px 6px; font-size: 10px; color: var(--text); font-family: var(--mono); }

    /* ── Slide-in ── */
    .slide-in { animation: slideIn 0.2s ease-out; }
    @keyframes slideIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }

    /* ── Portfolio table ── */
    .port-table { width: 100%; border-collapse: collapse; }
    .port-table th { font-size: 7px; color: var(--text3); letter-spacing: 0.18em; text-transform: uppercase; padding: 8px 12px; text-align: right; border-bottom: 1px solid var(--border); font-weight: 700; font-family: var(--mono); }
    .port-table th:first-child { text-align: left; }
    .port-table td { padding: 10px 12px; font-size: 10px; text-align: right; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; font-family: var(--mono); }
    .port-table td:first-child { text-align: left; }
    .port-table tr:hover td { background: var(--surface2); }
    .port-table tr:last-child td { border-bottom: none; }

    /* ── How It Works ── */
    .how-section { border-left: 2px solid var(--accent); padding-left: 20px; margin-bottom: 32px; }
    .how-section h2 { font-size: 11px; letter-spacing: 0.2em; color: var(--text); font-family: var(--mono); margin-bottom: 12px; font-weight: 700; }
    .how-section p { font-size: 13px; color: var(--text2); line-height: 1.8; font-family: var(--sans); margin-bottom: 10px; }
    .how-section .formula { font-family: var(--mono); font-size: 12px; background: var(--surface2); border: 1px solid var(--border); padding: 12px 16px; margin: 12px 0; color: var(--text); letter-spacing: 0.04em; }
    .how-section ul { padding-left: 18px; font-size: 12px; color: var(--text2); line-height: 2; font-family: var(--sans); }

    /* ── Stock Selector ── */
    .stock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 6px; }
    .stock-chip {
      padding: 7px 10px; font-size: 8px; font-family: var(--mono); font-weight: 700;
      letter-spacing: 0.12em; cursor: pointer; border: 1px solid var(--border);
      background: var(--bg); color: var(--text2); transition: all 0.12s; text-align: center;
    }
    .stock-chip:hover { border-color: var(--text); color: var(--text); }
    .stock-chip.active { background: var(--invert); color: var(--invert-text); border-color: var(--invert); }
    .stock-chip .chip-ex { display: block; font-size: 6px; color: inherit; opacity: 0.5; margin-top: 2px; letter-spacing: 0.1em; }

    /* ── Prob meter ── */
    .prob-meter { position: relative; width: 100%; height: 8px; background: var(--surface2); border: 1px solid var(--border); overflow: hidden; }
    .prob-meter-fill { height: 100%; transition: width 1.2s cubic-bezier(0.4,0,0.2,1); }

    /* ── Number colors ── */
    .up   { color: var(--green)  !important; }
    .down { color: var(--red)    !important; }
    .flat { color: var(--text3)  !important; }

    /* ── Divider ── */
    .divider { height: 1px; background: var(--border); margin: 20px 0; }

    /* ── Score ring ── */
    .score-ring { display: flex; flex-direction: column; align-items: center; gap: 4px; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .nav { padding: 0 16px; }
      .nav-tabs { display: none; }
      .mobile-tabs { display: flex !important; }
      .grid-2,.grid-3,.grid-4,.grid-5 { grid-template-columns: 1fr; }
      .main-split { flex-direction: column !important; }
    }

    /* ── Mobile bottom nav ── */
    .mobile-tabs {
      display: none; position: fixed; bottom: 0; left: 0; right: 0;
      background: var(--invert); border-top: 1.5px solid var(--border2);
      z-index: 200;
    }
    .mobile-tab {
      flex: 1; padding: 12px 4px; font-size: 7px; font-family: var(--mono);
      letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700;
      color: rgba(245,240,232,0.4); background: transparent; border: none; cursor: pointer;
      transition: color 0.12s;
    }
    .mobile-tab.active { color: var(--invert-text); }

    /* ── Scroll area ── */
    .scroll-area { overflow-y: auto; max-height: 460px; padding-right: 4px; }

    /* ── Separator ── */
    .sep { display: flex; align-items: center; gap: 10px; margin: 16px 0; }
    .sep-line { flex: 1; height: 1px; background: var(--border); }
    .sep-text { font-size: 7px; color: var(--text3); letter-spacing: 0.2em; font-family: var(--mono); }

    /* ── Heatmap cell ── */
    .heatcell { padding: 8px 12px; text-align: center; font-size: 11px; font-family: var(--mono); font-weight: 700; }
  `}</style>
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt      = (n, d = 2) => (n == null || !isFinite(n) ? "—" : n.toFixed(d));
const fmtPct   = (n) => (n >= 0 ? "+" : "") + fmt(n) + "%";
const colorChg = (n) => n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--text2)";
const classChg = (n) => n > 0 ? "up" : n < 0 ? "down" : "flat";

const randNorm = () => {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// ─── MATH ENGINE ─────────────────────────────────────────────────────────────

function runMonteCarlo({ S0, mu, sigma, days, n = 600, sentimentAdj = 0, sigmaMultiplier = 1 }) {
  if (!S0 || !isFinite(S0) || !isFinite(mu) || !isFinite(sigma) || sigma <= 0) return [];
  const dt      = 1 / 252;
  const adjMu   = mu + sentimentAdj;
  const adjSig  = sigma * sigmaMultiplier;
  const paths   = [];
  for (let i = 0; i < n; i++) {
    const path = [S0];
    for (let d = 1; d <= days; d++) {
      const prev = path[path.length - 1];
      const next = prev * Math.exp((adjMu - 0.5 * adjSig * adjSig) * dt + adjSig * Math.sqrt(dt) * randNorm());
      path.push(isFinite(next) && next > 0 ? next : prev);
    }
    paths.push(path);
  }
  return paths;
}

function buildMarkovMatrix(returns) {
  if (!returns || returns.length < 3) return null;
  const states = returns.map(r => r < -0.005 ? 0 : r > 0.005 ? 2 : 1);
  const m = [[1,1,1],[1,1,1],[1,1,1]];
  for (let i = 0; i < states.length - 1; i++) m[states[i]][states[i+1]]++;
  return m.map(row => { const s = row.reduce((a,b)=>a+b,0); return row.map(v=>v/s); });
}

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

function calcVaR(finals, S0, conf = 0.95) {
  if (!finals || finals.length === 0 || !S0) return 0;
  const pnl = finals.map(p => (p - S0) / S0 * 100).sort((a,b)=>a-b);
  return pnl[Math.floor((1 - conf) * pnl.length)] ?? 0;
}

function calcSharpe(mu, sigma, rf = 0.05) {
  return sigma > 0 ? (mu - rf) / sigma : 0;
}

function calcSortino(returns, rf = 0.05) {
  if (!returns || returns.length === 0) return 0;
  const annMu    = returns.reduce((a,b)=>a+b,0)/returns.length * 252;
  const downside = returns.filter(r => r < 0);
  if (downside.length === 0) return Infinity;
  const downVar  = downside.reduce((a,b)=>a+b*b,0)/downside.length * 252;
  return (annMu - rf) / Math.sqrt(downVar);
}

function calcMaxDrawdown(prices) {
  let peak = prices[0], maxDD = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

function calcBeta(stockReturns, marketMu = 0.10) {
  // simplified beta estimate using return correlation assumption
  if (!stockReturns || stockReturns.length < 5) return 1;
  const mean = stockReturns.reduce((a,b)=>a+b,0)/stockReturns.length;
  const variance = stockReturns.reduce((a,b)=>a+(b-mean)**2,0)/stockReturns.length;
  const annVol = Math.sqrt(variance * 252);
  return Math.max(0.1, Math.min(3, annVol / 0.18)); // normalized vs ~18% market vol
}

function calcCalmarRatio(mu, maxDD) {
  return maxDD > 0 ? (mu * 100) / maxDD : 0;
}

const pctile = (arr, p) => {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a,b)=>a-b);
  return s[Math.min(Math.floor(p * s.length / 100), s.length - 1)];
};

function computeStats(finals, S0, gbm, adj) {
  if (!finals || finals.length === 0) return null;
  const sorted = [...finals].sort((a,b)=>a-b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean   = finals.reduce((a,b)=>a+b,0) / finals.length;
  const sigma  = gbm.sigma * (adj?.sigmaMultiplier || 1);
  const adjMu  = gbm.mu + (adj?.sentimentAdj || 0);
  const pnlPct = finals.map(f => (f - S0) / S0 * 100);
  return {
    finals, S0,
    probUp:      (finals.filter(f=>f>S0).length / finals.length) * 100,
    prob2up:     (finals.filter(f=>f>S0*1.02).length / finals.length) * 100,
    prob5up:     (finals.filter(f=>f>S0*1.05).length / finals.length) * 100,
    prob10up:    (finals.filter(f=>f>S0*1.10).length / finals.length) * 100,
    prob15up:    (finals.filter(f=>f>S0*1.15).length / finals.length) * 100,
    prob20up:    (finals.filter(f=>f>S0*1.20).length / finals.length) * 100,
    prob2down:   (finals.filter(f=>f<S0*0.98).length / finals.length) * 100,
    prob5down:   (finals.filter(f=>f<S0*0.95).length / finals.length) * 100,
    prob10down:  (finals.filter(f=>f<S0*0.90).length / finals.length) * 100,
    prob15down:  (finals.filter(f=>f<S0*0.85).length / finals.length) * 100,
    prob20down:  (finals.filter(f=>f<S0*0.80).length / finals.length) * 100,
    median, mean,
    p1:   pctile(finals, 1),
    p5:   pctile(finals, 5),
    p10:  pctile(finals, 10),
    p25:  pctile(finals, 25),
    p75:  pctile(finals, 75),
    p90:  pctile(finals, 90),
    p95:  pctile(finals, 95),
    p99:  pctile(finals, 99),
    var95: calcVaR(finals, S0, 0.95),
    var99: calcVaR(finals, S0, 0.99),
    sharpe: calcSharpe(adjMu, sigma),
    expectedReturn: (mean - S0) / S0 * 100,
    stdDev:   Math.sqrt(pnlPct.reduce((a,b)=>a+(b - (mean-S0)/S0*100)**2,0)/pnlPct.length),
    skewness: (() => {
      const m = pnlPct.reduce((a,b)=>a+b,0)/pnlPct.length;
      const s = Math.sqrt(pnlPct.reduce((a,b)=>a+(b-m)**2,0)/pnlPct.length);
      return s > 0 ? pnlPct.reduce((a,b)=>a+((b-m)/s)**3,0)/pnlPct.length : 0;
    })(),
    kurtosis: (() => {
      const m = pnlPct.reduce((a,b)=>a+b,0)/pnlPct.length;
      const s = Math.sqrt(pnlPct.reduce((a,b)=>a+(b-m)**2,0)/pnlPct.length);
      return s > 0 ? pnlPct.reduce((a,b)=>a+((b-m)/s)**4,0)/pnlPct.length - 3 : 0;
    })(),
  };
}

// ─── CANVAS DRAWING ──────────────────────────────────────────────────────────

function drawMCChart(canvas, paths, days, S0) {
  if (!canvas || !paths || paths.length === 0) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W    = Math.max(rect.width, 300);
  const H    = 320;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const pad = { top: 20, right: 30, bottom: 30, left: 54 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const allV = paths.flat();
  const minV = Math.min(...allV);
  const maxV = Math.max(...allV);
  const rng  = maxV - minV || 1;

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = "#EDE8DE"; ctx.fillRect(0,0,W,H);

  const xS = d => pad.left + (d / days) * cW;
  const yS = v => pad.top + cH - ((v - minV) / rng) * cH;

  // Grid
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = pad.top + t * cH;
    ctx.beginPath(); ctx.strokeStyle = "#C8BFA8"; ctx.lineWidth = 0.5; ctx.setLineDash([2,4]);
    ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.setLineDash([]);
  });

  // Draw paths
  const bulls = paths.filter(p => p[p.length-1] >= S0);
  const bears = paths.filter(p => p[p.length-1] < S0);

  const drawPaths = (subset, color, alpha) => {
    subset.forEach(path => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 0.6;
      path.forEach((v, d) => d === 0 ? ctx.moveTo(xS(d), yS(v)) : ctx.lineTo(xS(d), yS(v)));
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  };

  drawPaths(bears, "#C0392B", 0.12);
  drawPaths(bulls, "#1D7A4A", 0.12);

  // Percentile bands
  const pctPath = (p) => {
    const pts = [];
    for (let d = 0; d <= days; d++) {
      const vals = paths.map(path => path[d]).filter(isFinite).sort((a,b)=>a-b);
      pts.push(vals[Math.floor(p * vals.length / 100)] ?? S0);
    }
    return pts;
  };

  const p25 = pctPath(25), p75 = pctPath(75), p10 = pctPath(10), p90 = pctPath(90);
  const drawBand = (lo, hi, color, alpha) => {
    ctx.beginPath(); ctx.globalAlpha = alpha;
    lo.forEach((v, d) => d === 0 ? ctx.moveTo(xS(d), yS(v)) : ctx.lineTo(xS(d), yS(v)));
    for (let d = days; d >= 0; d--) ctx.lineTo(xS(d), yS(hi[d]));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 1;
  };

  drawBand(p10, p90, "#1A3A6B", 0.06);
  drawBand(p25, p75, "#1A3A6B", 0.12);

  // Median
  const medPath = pctPath(50);
  ctx.beginPath(); ctx.strokeStyle = "#0D0C0A"; ctx.lineWidth = 1.5; ctx.setLineDash([]);
  medPath.forEach((v, d) => d === 0 ? ctx.moveTo(xS(d), yS(v)) : ctx.lineTo(xS(d), yS(v)));
  ctx.stroke();

  // S0 line
  ctx.beginPath(); ctx.strokeStyle = "#C9960A"; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
  ctx.moveTo(pad.left, yS(S0)); ctx.lineTo(pad.left + cW, yS(S0)); ctx.stroke();
  ctx.setLineDash([]);

  // Axes
  ctx.strokeStyle = "#0D0C0A"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + cH);
  ctx.lineTo(pad.left + cW, pad.top + cH); ctx.stroke();

  // Y labels
  [minV, S0, maxV].forEach(v => {
    ctx.fillStyle = "#4A4438"; ctx.font = "8px 'Space Mono'"; ctx.textAlign = "right";
    ctx.fillText(v.toFixed(0), pad.left - 4, yS(v) + 3);
  });

  // X labels
  [0, Math.round(days/2), days].forEach(d => {
    ctx.fillStyle = "#4A4438"; ctx.font = "8px 'Space Mono'"; ctx.textAlign = "center";
    ctx.fillText("D" + d, xS(d), pad.top + cH + 16);
  });
}

function drawDistChart(canvas, finals, S0) {
  if (!canvas || !finals || finals.length === 0 || !S0) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W    = Math.max(rect.width, 200);
  const H    = 200;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const pad = { top: 16, right: 16, bottom: 24, left: 10 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const minV = Math.min(...finals), maxV = Math.max(...finals);
  const bins = 40, bW = cW / bins;
  const counts = new Array(bins).fill(0);
  const bucketCenters = [];
  finals.forEach(f => {
    const i = Math.min(bins - 1, Math.floor((f - minV) / (maxV - minV + 0.0001) * bins));
    counts[i]++;
  });
  const maxC = Math.max(...counts);
  const xS = v => pad.left + ((v - minV) / (maxV - minV || 1)) * cW;
  const yS = c => pad.top + cH - (c / maxC) * cH;

  ctx.fillStyle = "#EDE8DE"; ctx.fillRect(0,0,W,H);

  counts.forEach((c, i) => {
    const bc = minV + (i + 0.5) * (maxV - minV) / bins;
    const x  = pad.left + i * bW;
    const bH = cH - (yS(c) - pad.top);
    ctx.fillStyle = bc > S0 ? "rgba(29,122,74,0.65)" : "rgba(192,57,43,0.55)";
    ctx.fillRect(x + 0.5, yS(c), bW - 1, bH);
  });

  // Axes
  ctx.strokeStyle = "#0D0C0A"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + cH);
  ctx.lineTo(pad.left + cW, pad.top + cH); ctx.stroke();

  [minV, S0, maxV].forEach(v => {
    ctx.fillStyle = "#4A4438"; ctx.font = "7px 'Space Mono'"; ctx.textAlign = "center";
    ctx.fillText("" + v.toFixed(0), xS(v), pad.top + cH + 13);
  });

  // S0 line
  ctx.beginPath(); ctx.strokeStyle = "#C9960A"; ctx.lineWidth = 1.2; ctx.setLineDash([2,3]);
  ctx.moveTo(xS(S0), pad.top); ctx.lineTo(xS(S0), pad.top + cH); ctx.stroke(); ctx.setLineDash([]);

  const var5x = pctile(finals, 5);
  ctx.beginPath(); ctx.strokeStyle = "rgba(192,57,43,0.7)"; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
  ctx.moveTo(xS(var5x), pad.top); ctx.lineTo(xS(var5x), pad.top + cH); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#C0392B"; ctx.font = "7px 'Space Mono'"; ctx.textAlign = "center";
  ctx.fillText("VaR95", xS(var5x), pad.top + 9);
}

function drawSparkline(canvas, prices, change, w = 60, h = 22) {
  if (!canvas || !prices || prices.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const min = Math.min(...prices), max = Math.max(...prices), rng = max - min || 1;
  const xS = (i) => (i / (prices.length - 1)) * w;
  const yS = (v) => h - 2 - ((v - min) / rng) * (h - 4);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath(); ctx.strokeStyle = change >= 0 ? "#1D7A4A" : "#C0392B"; ctx.lineWidth = 1.2;
  prices.forEach((v, i) => i === 0 ? ctx.moveTo(xS(i), yS(v)) : ctx.lineTo(xS(i), yS(v)));
  ctx.stroke();
}

function Sparkline({ prices, change, width = 60, height = 22 }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) drawSparkline(ref.current, prices, change, width, height); }, [prices, change]);
  return <canvas ref={ref} style={{ display:"block" }}/>;
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

async function fetchStockData(symbol) {
  // Try TwelveData first
  if (TD_KEY) {
    const url  = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=90&apikey=${TD_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.status !== "error" && data.values?.length >= 2) {
      const prices = data.values.map(v => parseFloat(v.close)).filter(isFinite).reverse();
      const latest = prices[prices.length - 1];
      const prev   = prices[prices.length - 2];
      const volume = data.values[0]?.volume ? parseInt(data.values[0].volume) : null;
      const high52 = Math.max(...prices), low52 = Math.min(...prices);
      return { prices, latest, change: ((latest - prev) / prev) * 100, volume, high52, low52 };
    }
  }
  // Fallback to Finnhub (US only, symbol must be clean)
  if (FH_KEY && !symbol.includes(":")) {
    const to   = Math.floor(Date.now() / 1000);
    const from = to - 90 * 86400;
    const url  = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FH_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.s === "ok" && data.c?.length >= 2) {
      const prices = data.c.filter(isFinite);
      const latest = prices[prices.length - 1];
      const prev   = prices[prices.length - 2];
      const high52 = Math.max(...prices), low52 = Math.min(...prices);
      return { prices, latest, change: ((latest - prev) / prev) * 100, volume: data.v?.[data.v.length-1] ?? null, high52, low52 };
    }
  }
  throw new Error("No price data available. Check your API keys.");
}

async function groqChat(prompt, maxTokens = 1200) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", Authorization:`Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, max_tokens: maxTokens, temperature: 0.7,
      messages: [{ role:"user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Streaming news — returns a generator that yields tokens
async function* groqStream(prompt, maxTokens = 900) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", Authorization:`Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, max_tokens: maxTokens, temperature: 0.7,
      stream: true,
      messages: [{ role:"user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Groq stream error ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = dec.decode(value);
    const lines = chunk.split("\n").filter(l => l.startsWith("data: ") && !l.includes("[DONE]"));
    for (const line of lines) {
      try {
        const json  = JSON.parse(line.slice(6));
        const token = json.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch {}
    }
  }
}

async function fetchAndStreamNews(symbol, onToken, onDone) {
  const prompt =
    `Generate 6 realistic plausible recent news headlines for ${symbol} stock (as of 2025). ` +
    `Return ONLY a valid JSON array, no markdown, no preamble:\n` +
    `[{"title":"...","source":"...","time":"Xh ago","sentiment":<-1 to 1>,"impact":<0 to 1>},...]`;
  let buffer = "";
  try {
    for await (const token of groqStream(prompt, 700)) {
      buffer += token;
      onToken(buffer);
    }
    const clean = buffer.replace(/```json|```/g,"").trim();
    const startIdx = clean.indexOf("[");
    const endIdx   = clean.lastIndexOf("]");
    if (startIdx !== -1 && endIdx !== -1) {
      const items = JSON.parse(clean.slice(startIdx, endIdx+1));
      onDone(items);
    } else {
      onDone([]);
    }
  } catch(e) {
    console.error("Stream error:", e);
    onDone([]);
  }
}

async function analyzeNews(items, symbol) {
  const fallback = { sentiment:0, sentimentAdj:0, sigmaMultiplier:1, summary:"Unavailable.", keyFactors:[], direction:"NEUTRAL", confidence:50 };
  if (!items || items.length === 0) return fallback;
  const headlines = items.slice(0,6).map((n,i)=>`${i+1}. ${n.title}`).join("\n");
  try {
    const text = await groqChat(
      `You are a quantitative analyst. Analyze these news for ${symbol}. ` +
      `Return ONLY valid JSON, no markdown:\n` +
      `{"sentiment":<-1 to 1>,"sentimentAdj":<annualized drift float e.g. 0.03>,"sigmaMultiplier":<0.8 to 1.5>,` +
      `"summary":"<2 sentences>","keyFactors":["<f1>","<f2>","<f3>"],"direction":"<BULLISH|BEARISH|NEUTRAL>","confidence":<0-100>}\n` +
      `Headlines:\n${headlines}`
    );
    const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
    parsed.sigmaMultiplier = Math.max(0.5, Math.min(2.5, parsed.sigmaMultiplier || 1));
    parsed.sentimentAdj    = Math.max(-0.5, Math.min(0.5, parsed.sentimentAdj || 0));
    return { ...fallback, ...parsed };
  } catch { return fallback; }
}

// ─── ENV BANNER ───────────────────────────────────────────────────────────────
function EnvBanner() {
  const missing = [];
  if (!TD_KEY && !FH_KEY) missing.push("VITE_TWELVEDATA_KEY or VITE_FINNHUB_KEY");
  if (!GROQ_KEY) missing.push("VITE_GROQ_KEY");
  if (!missing.length) return null;
  return (
    <div className="env-banner">
      <h3>⚠ MISSING ENVIRONMENT VARIABLES</h3>
      <p>
        Set these in Vercel Settings → Environment Variables, then redeploy:<br/><br/>
        {missing.map(k => <span key={k}><code>{k}</code>&nbsp;</span>)}<br/><br/>
        Indian stocks need <code>VITE_TWELVEDATA_KEY</code> (TwelveData supports NSE/BSE).
        US stocks also work with <code>VITE_FINNHUB_KEY</code> as fallback.
      </p>
    </div>
  );
}

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(id); }, []);
  const ist = new Date(t.getTime() + (5.5 * 3600 * 1000));
  const utcStr = t.toUTCString().slice(17,25);
  const istStr = ist.toUTCString().slice(17,22);
  return <span className="nav-time">{utcStr} UTC · {istStr} IST</span>;
}

// ─── PROB ARC SVG ─────────────────────────────────────────────────────────────
function ProbArc({ value, color, size = 100, label }) {
  const r = 38, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const dash  = (value / 100) * circ;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition:"stroke-dasharray 1.2s ease" }}/>
        <text x={cx} y={cy+5} textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="Space Mono">
          {Math.round(value)}%
        </text>
      </svg>
      {label && <span style={{ fontSize:8, color:"var(--text3)", letterSpacing:"0.14em", fontFamily:"var(--mono)" }}>{label}</span>}
    </div>
  );
}

// ─── STOCK SELECTOR MODAL ─────────────────────────────────────────────────────
function StockSelector({ onSelect, currentSym }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = ALL_STOCKS.filter(s =>
    !search || s.display.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.sector.toLowerCase().includes(search.toLowerCase())
  );
  const usList = filtered.filter(s => s.exchange === "US");
  const inList = filtered.filter(s => s.exchange === "IN");

  return (
    <>
      <button className="btn btn-outline" style={{ fontSize:"8px" }} onClick={()=>setOpen(true)}>
        ▾ {getDisplay(currentSym)}
      </button>
      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(13,12,10,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setOpen(false)}>
          <div style={{ background:"var(--bg)", border:"1.5px solid var(--accent)", width:560, maxHeight:"80vh", overflow:"auto", padding:24 }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <span style={{ fontSize:9, letterSpacing:"0.22em", fontFamily:"var(--mono)", fontWeight:700 }}>SELECT STOCK / INDEX</span>
              <button className="btn btn-ghost" style={{ padding:"2px 8px" }} onClick={()=>setOpen(false)}>✕</button>
            </div>
            <input className="input" placeholder="Search by symbol, name, sector…" value={search}
              onChange={e=>setSearch(e.target.value)} style={{ marginBottom:16 }} autoFocus/>

            <div style={{ fontSize:8, letterSpacing:"0.2em", color:"var(--text3)", marginBottom:8, fontFamily:"var(--mono)" }}>🇺🇸 US MARKETS</div>
            <div className="stock-grid" style={{ marginBottom:20 }}>
              {usList.map(s => (
                <div key={s.sym} className={`stock-chip${s.sym===currentSym?" active":""}`}
                  onClick={()=>{ onSelect(s.sym); setOpen(false); setSearch(""); }}
                  title={s.name}>
                  {s.display}
                  <span className="chip-ex">{s.sector}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize:8, letterSpacing:"0.2em", color:"var(--text3)", marginBottom:8, fontFamily:"var(--mono)" }}>🇮🇳 INDIAN MARKETS (NSE/BSE)</div>
            <div className="stock-grid">
              {inList.map(s => (
                <div key={s.sym} className={`stock-chip${s.sym===currentSym?" active":""}`}
                  onClick={()=>{ onSelect(s.sym); setOpen(false); setSearch(""); }}
                  title={s.name}>
                  {s.display}
                  <span className="chip-ex">{s.sector}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PAGE: NEWS ───────────────────────────────────────────────────────────────
function NewsPage({ symbol, stockData }) {
  const [news, setNews]       = useState([]);
  const [streamRaw, setStreamRaw] = useState(""); // raw streaming JSON
  const [streaming, setStreaming] = useState(false);
  const [analysis, setAnalysis]   = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const cur = getCurrency(symbol);

  const load = useCallback(async () => {
    setStreaming(true); setNews([]); setAnalysis(null); setStreamRaw("");
    setAnalysisLoading(false);

    await fetchAndStreamNews(
      getDisplay(symbol),
      (rawBuf) => { setStreamRaw(rawBuf); },
      async (items) => {
        setStreaming(false);
        setNews(items);
        if (items.length > 0) {
          setAnalysisLoading(true);
          const anal = await analyzeNews(items, getDisplay(symbol));
          setAnalysis(anal);
          setAnalysisLoading(false);
        }
      }
    );
  }, [symbol]);

  useEffect(() => { load(); }, [load]);

  const sentColor  = s => s > 0.2 ? "var(--green)" : s < -0.2 ? "var(--red)" : "var(--yellow)";
  const sentLabel  = s => s > 0.2 ? "BULLISH" : s < -0.2 ? "BEARISH" : "NEUTRAL";
  const sentTagCls = s => s > 0.2 ? "tag-bull" : s < -0.2 ? "tag-bear" : "tag-neutral";

  return (
    <div style={{ padding:"24px 36px", flex:1 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0, marginBottom:5 }}>
            NEWS INTELLIGENCE · {getDisplay(symbol)} · {getName(symbol)}
          </div>
          <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>
            AI-synthesized feed via Groq LLaMA 3.3-70b · streaming
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-outline" onClick={load} disabled={streaming}>
            {streaming ? "STREAMING…" : "↺ REFRESH"}
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16 }}>
        {/* Feed */}
        <div className="card">
          <div className="section-label">LIVE FEED</div>

          {streaming && news.length === 0 && (
            <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text2)", lineHeight:1.7, padding:"20px 0", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              <span style={{ fontSize:8, color:"var(--text3)", display:"block", marginBottom:8, letterSpacing:"0.14em" }}>GENERATING…</span>
              {streamRaw}
              <span className="cursor"/>
            </div>
          )}

          {!streaming && news.length > 0 && (
            <div className="scroll-area">
              {news.map((item, i) => (
                <div className="news-item" key={i} style={{ animationDelay:`${i*0.04}s` }}>
                  <div className="news-meta">
                    <span className="news-source">{item.source?.toUpperCase()}</span>
                    <span style={{ color:"var(--border2)" }}>·</span>
                    <span className="news-time">{item.time}</span>
                    <span className={`tag ${sentTagCls(item.sentiment)}`} style={{ marginLeft:"auto" }}>
                      {sentLabel(item.sentiment)}
                    </span>
                  </div>
                  <div className="news-title">{item.title}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                    <span style={{ fontSize:7, color:"var(--text3)", width:42, fontFamily:"var(--mono)", letterSpacing:"0.1em" }}>IMPACT</span>
                    <div className="prob-meter" style={{ flex:1 }}>
                      <div className="prob-meter-fill" style={{ width:`${(item.impact||0.5)*100}%`, background:sentColor(item.sentiment) }}/>
                    </div>
                    <span style={{ fontSize:9, color:"var(--text2)", width:28, fontFamily:"var(--mono)" }}>{Math.round((item.impact||0.5)*100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!streaming && news.length === 0 && (
            <div style={{ padding:"40px 0", color:"var(--text3)", fontSize:10, textAlign:"center", fontFamily:"var(--mono)" }}>
              Press REFRESH to load news
            </div>
          )}
        </div>

        {/* Side panels */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card">
            <div className="section-label">AI VERDICT</div>
            {analysisLoading && <div className="loader"><div className="loader-dots"><span/><span/><span/></div><span style={{fontSize:9}}>Analyzing…</span></div>}
            {analysis && !analysisLoading && (
              <>
                <div style={{ textAlign:"center", padding:"14px 0 12px" }}>
                  <div style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.02em", fontFamily:"var(--mono)",
                    color: analysis.direction==="BULLISH"?"var(--green)":analysis.direction==="BEARISH"?"var(--red)":"var(--yellow)" }}>
                    {analysis.direction}
                  </div>
                  <div style={{ fontSize:9, color:"var(--text2)", marginTop:4, fontFamily:"var(--mono)" }}>{analysis.confidence}% CONFIDENCE</div>
                  <div className="prob-meter" style={{ marginTop:10 }}>
                    <div className="prob-meter-fill" style={{
                      width:`${analysis.confidence}%`,
                      background: analysis.direction==="BULLISH"?"var(--green)":analysis.direction==="BEARISH"?"var(--red)":"var(--yellow)"
                    }}/>
                  </div>
                </div>
                <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.75, marginBottom:12, fontFamily:"var(--sans)" }}>{analysis.summary}</div>
                <div className="section-label">KEY FACTORS</div>
                {(analysis.keyFactors||[]).map((f,i) => (
                  <div key={i} style={{ fontSize:9, color:"var(--text2)", padding:"5px 0", borderBottom:"1px solid var(--border)", display:"flex", gap:8, fontFamily:"var(--mono)" }}>
                    <span style={{ color:"var(--text3)" }}>{String(i+1).padStart(2,"0")}</span><span>{f}</span>
                  </div>
                ))}
              </>
            )}
            {!analysis && !analysisLoading && <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>Waiting for news…</div>}
          </div>

          {analysis && (
            <div className="card">
              <div className="section-label">SENTIMENT PARAMS</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { label:"Sentiment",      value:fmt(analysis.sentiment,3),           color:sentColor(analysis.sentiment) },
                  { label:"Drift Adj",      value:fmtPct(analysis.sentimentAdj*100),   color:analysis.sentimentAdj>=0?"var(--green)":"var(--red)" },
                  { label:"Vol Multiplier", value:fmt(analysis.sigmaMultiplier,2)+"×", color:"var(--text)" },
                ].map(({label,value,color}) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:8, color:"var(--text2)", fontFamily:"var(--mono)", letterSpacing:"0.1em" }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color, fontFamily:"var(--mono)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stockData && (
            <div className="card card-dark">
              <div style={{ fontSize:7, letterSpacing:"0.22em", color:"rgba(245,240,232,0.4)", marginBottom:6, fontFamily:"var(--mono)" }}>CURRENT PRICE</div>
              <div style={{ fontSize:26, fontWeight:700, letterSpacing:"-0.03em", fontFamily:"var(--mono)" }}>
                {cur}{fmt(stockData.latest)}
              </div>
              <div style={{ fontSize:10, marginTop:4, fontFamily:"var(--mono)", color: stockData.change >= 0 ? "#4ECC88" : "#E05555" }}>
                {fmtPct(stockData.change)} today
              </div>
              {stockData.high52 && (
                <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div>
                    <div style={{ fontSize:7, color:"rgba(245,240,232,0.3)", letterSpacing:"0.14em", fontFamily:"var(--mono)" }}>90D HIGH</div>
                    <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"#4ECC88" }}>{cur}{fmt(stockData.high52)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:7, color:"rgba(245,240,232,0.3)", letterSpacing:"0.14em", fontFamily:"var(--mono)" }}>90D LOW</div>
                    <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"#E05555" }}>{cur}{fmt(stockData.low52)}</div>
                  </div>
                </div>
              )}
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
  const cur = getCurrency(symbol);

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
      if (GROQ_KEY) {
        const quickNews = await groqChat(
          `In 3 bullet points, what is the current market sentiment for ${getDisplay(symbol)}?`
        );
        adj = await analyzeNews([{ title: quickNews }], getDisplay(symbol));
      }
      const S0       = stockData.latest;
      const newPaths = runMonteCarlo({ S0, mu:gbm.mu, sigma:gbm.sigma, days, n:600, sentimentAdj:adj.sentimentAdj, sigmaMultiplier:adj.sigmaMultiplier });
      setAiAdj(adj);
      setPaths(newPaths);
      const finals = newPaths.map(p=>p[p.length-1]);
      setStats(computeStats(finals, S0, gbm, adj));
      setRan(true);
    } catch(e) {
      console.error("Sim error:", e);
      setError(e.message);
    }
    setLoading(false);
  }, [gbm, stockData, days, symbol]);

  useEffect(() => {
    if (!paths || !mcCanvasRef.current) return;
    const draw = () => drawMCChart(mcCanvasRef.current, paths, days, stockData.latest);
    const el   = mcCanvasRef.current.parentElement;
    if (el.getBoundingClientRect().width > 0) { draw(); return; }
    const ro = new ResizeObserver(() => { if (el.getBoundingClientRect().width > 0) { ro.disconnect(); draw(); } });
    ro.observe(el); return () => ro.disconnect();
  }, [paths, days, stockData]);

  useEffect(() => {
    if (!stats || !distCanvasRef.current) return;
    const draw = () => drawDistChart(distCanvasRef.current, stats.finals, stats.S0);
    const el   = distCanvasRef.current.parentElement;
    if (el.getBoundingClientRect().width > 0) { draw(); return; }
    const ro = new ResizeObserver(() => { if (el.getBoundingClientRect().width > 0) { ro.disconnect(); draw(); } });
    ro.observe(el); return () => ro.disconnect();
  }, [stats]);

  return (
    <div style={{ padding:"24px 36px", flex:1 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0, marginBottom:5 }}>
            MONTE CARLO SIMULATION · {getDisplay(symbol)}
          </div>
          <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>
            GBM + Markov regime · AI-adjusted drift &amp; vol · 600 paths
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:8, color:"var(--text3)", fontFamily:"var(--mono)", letterSpacing:"0.14em" }}>HORIZON</span>
          {[7,14,30,60,90].map(d => (
            <button key={d} className="btn btn-outline" style={{ padding:"5px 10px", fontSize:"8px",
              background:days===d?"var(--invert)":"transparent",
              color:days===d?"var(--invert-text)":"var(--text3)",
              borderColor:days===d?"var(--invert)":"var(--border)" }}
              onClick={()=>setDays(d)}>{d}D</button>
          ))}
          <button className="btn btn-accent" onClick={runSim} disabled={loading||!gbm}>
            {loading ? "RUNNING…" : ran ? "↺ RE-RUN" : "▶ RUN SIM"}
          </button>
        </div>
      </div>

      {gbm && (
        <div className="grid-4" style={{ marginBottom:16 }}>
          {[
            { label:"Drift (μ)",      value:fmtPct(gbm.mu*100),              color:colorChg(gbm.mu) },
            { label:"Volatility (σ)", value:fmt(gbm.sigma*100,1)+"%",         color:"var(--text)" },
            { label:"Sharpe Ratio",   value:fmt(calcSharpe(gbm.mu,gbm.sigma),2), color:calcSharpe(gbm.mu,gbm.sigma)>1?"var(--green)":calcSharpe(gbm.mu,gbm.sigma)>0?"var(--yellow)":"var(--red)" },
            { label:"Max Drawdown",   value:"-"+fmt(calcMaxDrawdown(stockData?.prices||[]),1)+"%", color:"var(--red)" },
          ].map(({label,value,color}) => (
            <div key={label} className="card card-sm">
              <div className="stat-label">{label}</div>
              <div style={{ fontSize:15, fontWeight:700, color, marginTop:4, fontVariantNumeric:"tabular-nums", fontFamily:"var(--mono)" }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {aiAdj && (
        <div style={{ padding:"8px 14px", marginBottom:14, background:"rgba(29,122,74,0.06)", border:"1px solid rgba(29,122,74,0.2)", fontSize:9, color:"var(--green)", fontFamily:"var(--mono)", display:"flex", gap:20 }}>
          <span>AI ADJ — Direction: {aiAdj.direction}</span>
          <span>Drift: {fmtPct(aiAdj.sentimentAdj*100)}</span>
          <span>Vol×: {fmt(aiAdj.sigmaMultiplier,2)}</span>
        </div>
      )}

      {error && (
        <div style={{ padding:"12px 16px", marginBottom:14, background:"rgba(192,57,43,0.07)", border:"1px solid rgba(192,57,43,0.2)", fontSize:10, color:"var(--red)", fontFamily:"var(--mono)" }}>⚠ {error}</div>
      )}

      {!ran && !loading && !error && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:260, border:"1px dashed var(--border)", color:"var(--text3)", fontSize:9, letterSpacing:"0.16em", flexDirection:"column", gap:10, fontFamily:"var(--mono)" }}>
          <span style={{ fontSize:24 }}>⟳</span>
          SELECT HORIZON · PRESS RUN SIM
        </div>
      )}

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:260, border:"1px solid var(--border)", flexDirection:"column", gap:16 }}>
          <div className="loader-dots"><span/><span/><span/></div>
          <span style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>Running 600 GBM paths + AI sentiment…</span>
        </div>
      )}

      {ran && !loading && paths && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card" style={{ padding:"14px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, flexWrap:"wrap", gap:8 }}>
              <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0 }}>
                PRICE PATH FAN — {days}D · 600 SIMULATIONS
              </div>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                {[["var(--invert)","Median"],["rgba(29,122,74,0.65)","Bull"],["rgba(192,57,43,0.55)","Bear"],["rgba(26,58,107,0.2)","10–90%ile"]].map(([c,l])=>(
                  <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:8, color:"var(--text2)", fontFamily:"var(--mono)" }}>
                    <div style={{ width:14, height:2, background:c, border: c==="var(--invert)"?"none":"none" }}/>
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-wrap"><canvas ref={mcCanvasRef}/></div>
          </div>

          {stats && (
            <div className="grid-2">
              <div className="card">
                <div className="section-label">FINAL PRICE DISTRIBUTION</div>
                <div className="chart-wrap"><canvas ref={distCanvasRef}/></div>
              </div>

              <div className="card">
                <div className="section-label">SIMULATION STATS</div>
                {[
                  { label:"P(Price Up)",     value:fmt(stats.probUp,1)+"%",         color:stats.probUp>50?"var(--green)":"var(--red)", big:true },
                  { label:"Expected Return", value:fmtPct(stats.expectedReturn),    color:colorChg(stats.expectedReturn) },
                  { label:"Median Target",   value:cur+fmt(stats.median),           color:colorChg(stats.median-stats.S0) },
                  { label:"P5 Target",       value:cur+fmt(stats.p5),               color:"var(--red)" },
                  { label:"P25 Target",      value:cur+fmt(stats.p25),              color:"var(--text2)" },
                  { label:"P75 Target",      value:cur+fmt(stats.p75),              color:"var(--text2)" },
                  { label:"P95 Target",      value:cur+fmt(stats.p95),              color:"var(--green)" },
                  { label:"VaR 95%",         value:fmt(stats.var95,1)+"%",          color:"var(--red)" },
                  { label:"VaR 99%",         value:fmt(stats.var99,1)+"%",          color:"var(--red)" },
                  { label:"Sharpe",          value:fmt(stats.sharpe,2),             color:stats.sharpe>1?"var(--green)":stats.sharpe>0?"var(--yellow)":"var(--red)" },
                  { label:"Std Dev",         value:fmt(stats.stdDev,2)+"%",         color:"var(--text2)" },
                  { label:"Skewness",        value:fmt(stats.skewness,3),           color:stats.skewness>0?"var(--green)":"var(--red)" },
                ].map(({label,value,color,big}) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
                    <span style={{ fontSize:8, color:"var(--text2)", fontFamily:"var(--mono)", letterSpacing:"0.1em" }}>{label}</span>
                    <span style={{ fontSize:big?15:11, fontWeight:big?800:600, color, fontFamily:"var(--mono)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PAGE: PROBABILITY ────────────────────────────────────────────────────────
function ProbabilityPage({ symbol, stockData }) {
  const [stats, setStats]   = useState(null);
  const [days, setDays]     = useState(30);
  const [loading, setLoading] = useState(false);
  const [gbm, setGbm]         = useState(null);
  const cur = getCurrency(symbol);

  useEffect(() => {
    if (stockData?.prices?.length > 1) {
      const g = estimateGBM(stockData.prices);
      setGbm(g);
    }
  }, [stockData]);

  const run = useCallback(async () => {
    if (!gbm || !stockData) return;
    setLoading(true);
    const S0     = stockData.latest;
    const paths  = runMonteCarlo({ S0, mu:gbm.mu, sigma:gbm.sigma, days, n:1000 });
    const finals = paths.map(p => p[p.length-1]);
    setStats(computeStats(finals, S0, gbm, {}));
    setLoading(false);
  }, [gbm, stockData, days]);

  useEffect(() => { if (gbm && stockData) run(); }, [gbm, days]);

  const pColor = (v) => v > 60 ? "var(--green)" : v > 40 ? "var(--yellow)" : "var(--red)";

  return (
    <div style={{ padding:"24px 36px", flex:1 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0, marginBottom:5 }}>
            PROBABILITY ENGINE · {getDisplay(symbol)}
          </div>
          <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>
            1000-path Monte Carlo · full probability distribution · risk analytics
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[7,14,30,60,90].map(d => (
            <button key={d} className="btn btn-outline" style={{ padding:"5px 10px", fontSize:"8px",
              background:days===d?"var(--invert)":"transparent",
              color:days===d?"var(--invert-text)":"var(--text3)",
              borderColor:days===d?"var(--invert)":"var(--border)" }}
              onClick={()=>setDays(d)}>{d}D</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display:"flex", justifyContent:"center", padding:"40px 0" }}>
          <div className="loader"><div className="loader-dots"><span/><span/><span/></div><span>Running 1000 paths…</span></div>
        </div>
      )}

      {stats && !loading && (
        <>
          {/* Key metric arcs */}
          <div style={{ display:"flex", gap:24, justifyContent:"center", padding:"20px 0 24px", flexWrap:"wrap" }}>
            <ProbArc value={stats.probUp}    color={pColor(stats.probUp)}    label="P(UP)" size={110}/>
            <ProbArc value={stats.prob5up}   color={pColor(stats.prob5up)}   label="P(+5%)" size={110}/>
            <ProbArc value={stats.prob10up}  color={pColor(stats.prob10up)}  label="P(+10%)" size={110}/>
            <ProbArc value={stats.prob5down} color={stats.prob5down>40?"var(--red)":"var(--yellow)"} label="P(-5%)" size={110}/>
            <ProbArc value={stats.prob10down}color={stats.prob10down>30?"var(--red)":"var(--yellow)"} label="P(-10%)" size={110}/>
          </div>

          <div className="grid-3" style={{ marginBottom:14 }}>
            {/* Upside probabilities */}
            <div className="card">
              <div className="section-label">UPSIDE PROBABILITIES</div>
              {[
                { label:"P(+2%+)",  val:stats.prob2up },
                { label:"P(+5%+)",  val:stats.prob5up },
                { label:"P(+10%+)", val:stats.prob10up },
                { label:"P(+15%+)", val:stats.prob15up },
                { label:"P(+20%+)", val:stats.prob20up },
              ].map(({label,val}) => (
                <div key={label} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:8, color:"var(--text2)", fontFamily:"var(--mono)", letterSpacing:"0.1em" }}>{label}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:pColor(val), fontFamily:"var(--mono)" }}>{fmt(val,1)}%</span>
                  </div>
                  <div className="prob-meter">
                    <div className="prob-meter-fill" style={{ width:`${val}%`, background:"var(--green)" }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Downside probabilities */}
            <div className="card">
              <div className="section-label">DOWNSIDE RISK</div>
              {[
                { label:"P(-2%+)",  val:stats.prob2down },
                { label:"P(-5%+)",  val:stats.prob5down },
                { label:"P(-10%+)", val:stats.prob10down },
                { label:"P(-15%+)", val:stats.prob15down },
                { label:"P(-20%+)", val:stats.prob20down },
              ].map(({label,val}) => (
                <div key={label} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:8, color:"var(--text2)", fontFamily:"var(--mono)", letterSpacing:"0.1em" }}>{label}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:val>40?"var(--red)":"var(--yellow)", fontFamily:"var(--mono)" }}>{fmt(val,1)}%</span>
                  </div>
                  <div className="prob-meter">
                    <div className="prob-meter-fill" style={{ width:`${val}%`, background:"var(--red)" }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Risk metrics */}
            <div className="card">
              <div className="section-label">RISK ANALYTICS</div>
              {[
                { label:"VaR 95% (worst-case 5%)",   value:fmt(stats.var95,1)+"%",  color:"var(--red)" },
                { label:"VaR 99% (worst-case 1%)",   value:fmt(stats.var99,1)+"%",  color:"var(--red)" },
                { label:"Sharpe Ratio (rf=5%)",       value:fmt(stats.sharpe,2),     color:stats.sharpe>1?"var(--green)":stats.sharpe>0?"var(--yellow)":"var(--red)" },
                { label:"Sortino Ratio",              value:fmt(calcSortino(gbm.returns),2), color:"var(--text)" },
                { label:"Expected Return",            value:fmtPct(stats.expectedReturn), color:colorChg(stats.expectedReturn) },
                { label:"Distribution Skew",         value:fmt(stats.skewness,3),   color:stats.skewness>0?"var(--green)":"var(--red)" },
                { label:"Excess Kurtosis",            value:fmt(stats.kurtosis,3),   color:"var(--text2)" },
                { label:"Outcome Std Dev",            value:fmt(stats.stdDev,2)+"%", color:"var(--text2)" },
                { label:"Beta (est.)",                value:fmt(calcBeta(gbm.returns),2), color:"var(--text2)" },
                { label:"Max Drawdown (90d)",         value:"-"+fmt(calcMaxDrawdown(stockData?.prices||[]),1)+"%", color:"var(--red)" },
              ].map(({label,value,color}) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:8, color:"var(--text2)", fontFamily:"var(--mono)" }}>{label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color, fontFamily:"var(--mono)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Percentile table */}
          <div className="card">
            <div className="section-label">PRICE PERCENTILE TABLE — {days}D HORIZON</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    {["P1","P5","P10","P25","P50 (Median)","P75","P90","P95","P99"].map(h => (
                      <th key={h} style={{ fontSize:7, color:"var(--text3)", letterSpacing:"0.16em", padding:"8px 12px", textAlign:"center", borderBottom:"1px solid var(--border)", fontFamily:"var(--mono)", fontWeight:700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {[stats.p1,stats.p5,stats.p10,stats.p25,stats.median,stats.p75,stats.p90,stats.p95,stats.p99].map((v,i) => (
                      <td key={i} style={{ padding:"10px 12px", textAlign:"center", fontSize:11, fontFamily:"var(--mono)", fontWeight:600,
                        color: v > stats.S0 ? "var(--green)" : "var(--red)",
                        background: i === 4 ? "var(--surface2)" : "transparent",
                        borderBottom:"none" }}>
                        {cur}{fmt(v)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {[stats.p1,stats.p5,stats.p10,stats.p25,stats.median,stats.p75,stats.p90,stats.p95,stats.p99].map((v,i) => (
                      <td key={i} style={{ padding:"2px 12px", textAlign:"center", fontSize:9, fontFamily:"var(--mono)",
                        color: v > stats.S0 ? "var(--green)" : "var(--red)",
                        background: i === 4 ? "var(--surface2)" : "transparent" }}>
                        {fmtPct((v-stats.S0)/stats.S0*100)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PAGE: WATCHLIST ──────────────────────────────────────────────────────────
function WatchlistPage({ watchlist, setWatchlist, allQuotes }) {
  const [search, setSearch]     = useState("");
  const [mcResults, setMcResults] = useState({});
  const [running, setRunning]   = useState(false);
  const [sortKey, setSortKey]   = useState("sym");
  const [sortDir, setSortDir]   = useState(1);
  const [showSelector, setShowSelector] = useState(false);

  const handleAdd = (sym) => {
    if (!watchlist.includes(sym)) setWatchlist(w => [...w, sym]);
  };
  const handleRemove = (sym) => {
    if (!DEFAULT_WATCHLIST.includes(sym)) setWatchlist(w => w.filter(s => s !== sym));
  };
  const handleSort = (k) => {
    if (sortKey === k) setSortDir(d => -d);
    else { setSortKey(k); setSortDir(1); }
  };

  const runBatch = async () => {
    setRunning(true);
    for (const sym of watchlist) {
      const q = allQuotes[sym];
      if (!q?.prices?.length) continue;
      const gbm = estimateGBM(q.prices);
      const paths = runMonteCarlo({ S0:q.latest, mu:gbm.mu, sigma:gbm.sigma, days:30, n:300 });
      const finals = paths.map(p=>p[p.length-1]);
      const stats  = computeStats(finals, q.latest, gbm, {});
      setMcResults(r => ({
        ...r,
        [sym]: { probUp:stats?.probUp, median:stats?.median, var95:stats?.var95, sharpe:stats?.sharpe, sigma:gbm.sigma }
      }));
    }
    setRunning(false);
  };

  const rows = watchlist.map(sym => {
    const q  = allQuotes[sym];
    const mc = mcResults[sym];
    return { sym, display:getDisplay(sym), name:getName(sym), price:q?.latest, change:q?.change, prices:q?.prices,
             probUp:mc?.probUp, median:mc?.median, var95:mc?.var95, sharpe:mc?.sharpe, sigma:mc?.sigma,
             currency:getCurrency(sym) };
  }).sort((a,b) => {
    const av = a[sortKey] ?? -Infinity, bv = b[sortKey] ?? -Infinity;
    return typeof av === "string" ? av.localeCompare(bv)*sortDir : (bv-av)*sortDir;
  });

  const arrow = (k) => sortKey === k ? (sortDir > 0 ? " ↑" : " ↓") : "";
  const thStyle = (k) => ({ cursor:"pointer", userSelect:"none", color:sortKey===k?"var(--text)":"var(--text3)" });

  return (
    <div style={{ padding:"24px 36px", flex:1 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div className="section-label" style={{ borderBottom:"none", padding:0, margin:0, marginBottom:5 }}>
            WATCHLIST · {watchlist.length} SYMBOLS
          </div>
          <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>
            US + Indian markets · batch 30D MC simulation
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-outline" onClick={()=>setShowSelector(s=>!s)}>
            + ADD STOCK
          </button>
          <button className="btn btn-accent" onClick={runBatch} disabled={running}>
            {running ? "RUNNING…" : "▶ RUN BATCH MC"}
          </button>
        </div>
      </div>

      {showSelector && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:8, color:"var(--text3)", marginBottom:8, fontFamily:"var(--mono)", letterSpacing:"0.16em" }}>ADD TO WATCHLIST</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {ALL_STOCKS.filter(s => !watchlist.includes(s.sym)).map(s => (
              <div key={s.sym} className="stock-chip" onClick={() => handleAdd(s.sym)}
                style={{ fontSize:"8px", padding:"5px 10px" }} title={s.name}>
                {s.display}
                <span className="chip-ex">{s.exchange}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ overflowX:"auto" }}>
        <table className="port-table">
          <thead>
            <tr>
              <th onClick={()=>handleSort("display")} style={thStyle("display")}>SYMBOL{arrow("display")}</th>
              <th>EXCHANGE</th>
              <th onClick={()=>handleSort("price")} style={thStyle("price")}>PRICE{arrow("price")}</th>
              <th onClick={()=>handleSort("change")} style={thStyle("change")}>CHG%{arrow("change")}</th>
              <th onClick={()=>handleSort("probUp")} style={thStyle("probUp")}>P(UP) 30D{arrow("probUp")}</th>
              <th onClick={()=>handleSort("median")} style={thStyle("median")}>MEDIAN{arrow("median")}</th>
              <th onClick={()=>handleSort("var95")} style={thStyle("var95")}>VaR 95%{arrow("var95")}</th>
              <th onClick={()=>handleSort("sharpe")} style={thStyle("sharpe")}>SHARPE{arrow("sharpe")}</th>
              <th onClick={()=>handleSort("sigma")} style={thStyle("sigma")}>VOL (σ){arrow("sigma")}</th>
              <th>TREND</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.sym}>
                <td style={{ textAlign:"left", paddingLeft:20, fontWeight:700, fontSize:11 }}>
                  {row.display}
                  <div style={{ fontSize:8, color:"var(--text3)", fontWeight:400 }}>{row.name}</div>
                </td>
                <td style={{ textAlign:"center" }}>
                  <span className={`tag ${row.sym.includes(":NSE")||row.sym.includes(":BSE")?"tag-in":"tag-neutral"}`} style={{ fontSize:"6px" }}>
                    {row.sym.includes(":NSE")?"NSE":row.sym.includes(":BSE")?"BSE":"US"}
                  </span>
                </td>
                <td>{row.price!=null ? row.currency+fmt(row.price) : <span style={{ color:"var(--text3)" }}>—</span>}</td>
                <td style={{ color:colorChg(row.change??0) }}>{row.change!=null ? fmtPct(row.change) : "—"}</td>
                <td style={{ color:row.probUp!=null?(row.probUp>50?"var(--green)":"var(--red)"):"var(--text3)" }}>
                  {row.probUp!=null ? fmt(row.probUp,1)+"%" : <span style={{ color:"var(--text3)" }}>—</span>}
                </td>
                <td style={{ color:row.median!=null?colorChg((row.median??0)-(row.price??0)):"var(--text3)" }}>
                  {row.median!=null ? row.currency+fmt(row.median) : "—"}
                </td>
                <td style={{ color:"var(--red)" }}>{row.var95!=null ? fmt(row.var95,1)+"%" : "—"}</td>
                <td style={{ color:row.sharpe!=null?(row.sharpe>1?"var(--green)":row.sharpe>0?"var(--yellow)":"var(--red)"):"var(--text3)" }}>
                  {row.sharpe!=null ? fmt(row.sharpe,2) : "—"}
                </td>
                <td style={{ color:"var(--text2)" }}>{row.sigma!=null ? fmt(row.sigma*100,1)+"%" : "—"}</td>
                <td>
                  {row.prices?.length>1 && (
                    <Sparkline prices={row.prices.slice(-20)} change={row.change??0} width={52} height={18}/>
                  )}
                </td>
                <td>
                  {!DEFAULT_WATCHLIST.includes(row.sym) && (
                    <button className="btn btn-ghost" style={{ fontSize:"8px", padding:"2px 7px", color:"var(--text3)" }}
                      onClick={()=>handleRemove(row.sym)}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Object.keys(mcResults).length > 0 && (
        <div style={{ marginTop:12, fontSize:8, color:"var(--text3)", fontFamily:"var(--mono)" }}>
          * 300-path simulation, no AI sentiment. Use Simulation tab for full analysis.
        </div>
      )}
    </div>
  );
}

// ─── PAGE: HOW IT WORKS ───────────────────────────────────────────────────────
function HowItWorksPage() {
  return (
    <div style={{ padding:"28px 36px", flex:1, maxWidth:860, margin:"0 auto", width:"100%" }}>
      <div className="section-label" style={{ marginBottom:28 }}>HOW IT WORKS — METHODOLOGY</div>

      <div className="how-section">
        <h2>01 · GEOMETRIC BROWNIAN MOTION (GBM)</h2>
        <p>
          GBM is the mathematical backbone of this engine. It models a stock price as a continuous random process
          where the logarithm of returns follows a normal distribution. This is the same framework used
          in the Black-Scholes options pricing model.
        </p>
        <div className="formula">dS = μ·S·dt + σ·S·dW</div>
        <ul>
          <li><strong>S</strong> — current stock price</li>
          <li><strong>μ (drift)</strong> — the annualized expected return, estimated from 90-day log-return mean × 252 trading days</li>
          <li><strong>σ (volatility)</strong> — annualized standard deviation of log-returns (= daily σ × √252)</li>
          <li><strong>dW</strong> — a Wiener process increment, sampled from N(0, dt) using Box-Muller transform</li>
        </ul>
        <p style={{ marginTop:10 }}>
          Each discrete time step uses the exact GBM solution to avoid discretization bias:
        </p>
        <div className="formula">S(t+dt) = S(t) · exp[(μ - ½σ²)·dt + σ·√dt·Z]</div>
        <p>where Z ~ N(0,1). The ½σ² correction is the Itô correction — essential for unbiased simulation.</p>
      </div>

      <div className="how-section">
        <h2>02 · MONTE CARLO SIMULATION</h2>
        <p>
          Instead of solving for a single price trajectory, we simulate 600–1000 independent paths,
          each representing a possible future. This gives us a full probability distribution of outcomes.
        </p>
        <ul>
          <li>Each path runs for the selected horizon (7, 14, 30, 60, or 90 days)</li>
          <li>Final prices across all paths form an empirical distribution</li>
          <li><strong>P(Up)</strong> = fraction of paths ending above entry price</li>
          <li><strong>P(+5%)</strong> = fraction of paths ending ≥ 1.05 × entry</li>
          <li>Percentiles (P5, P25, P50, P75, P95) are read directly from the sorted finals array</li>
        </ul>
        <p>
          The law of large numbers ensures that with 1000 paths, probability estimates are accurate
          to within ±1–2% with high confidence.
        </p>
      </div>

      <div className="how-section">
        <h2>03 · MARKOV CHAIN REGIME DETECTION</h2>
        <p>
          Real markets don't have constant drift — they switch between Bull, Neutral, and Bear regimes.
          We model this with a 3-state discrete Markov chain estimated from the past 90 days of daily returns.
        </p>
        <ul>
          <li><strong>Bear</strong>: daily return &lt; −0.5%</li>
          <li><strong>Neutral</strong>: −0.5% ≤ return ≤ +0.5%</li>
          <li><strong>Bull</strong>: daily return &gt; +0.5%</li>
        </ul>
        <p>
          A 3×3 transition matrix is estimated by counting state-to-state transitions in the historical
          series. Each cell P(i→j) is the empirical probability of moving from regime i to j. This
          captures regime persistence (bull markets tend to continue) and mean reversion.
        </p>
        <div className="formula">{`Transition Matrix:\n[P(Bear→Bear)  P(Bear→Neutral)  P(Bear→Bull) ]\n[P(Neut→Bear)  P(Neut→Neutral)  P(Neut→Bull) ]\n[P(Bull→Bear)  P(Bull→Neutral)  P(Bull→Bull) ]`}</div>
      </div>

      <div className="how-section">
        <h2>04 · AI SENTIMENT ADJUSTMENT (GROQ LLAMA 3.3)</h2>
        <p>
          The engine calls Groq's LLaMA 3.3-70b model twice per analysis:
        </p>
        <ul>
          <li><strong>Step 1 — News generation:</strong> The AI synthesizes 6–8 plausible recent headlines for the stock, streamed in real-time.</li>
          <li><strong>Step 2 — Quantitative analysis:</strong> The same AI reads the headlines and returns structured JSON with a sentiment score (−1 to +1), an annualized drift adjustment, a volatility multiplier, and a directional verdict (BULLISH / BEARISH / NEUTRAL).</li>
        </ul>
        <p>
          These AI parameters then modify the GBM simulation:
        </p>
        <div className="formula">μ_adjusted = μ_historical + Δμ_sentiment<br/>σ_adjusted = σ_historical × σ_multiplier</div>
        <p>
          A bullish sentiment might add +3% annualized drift and compress volatility slightly,
          while bearish sentiment subtracts drift and expands vol — reflecting increased uncertainty.
        </p>
      </div>

      <div className="how-section">
        <h2>05 · RISK METRICS EXPLAINED</h2>
        <ul>
          <li>
            <strong>VaR 95% (Value at Risk)</strong> — The worst return you could expect in 95% of scenarios.
            If VaR 95% = −8%, it means there's a 5% chance of losing more than 8% over the horizon.
          </li>
          <li>
            <strong>Sharpe Ratio</strong> = (μ − r_f) / σ, where r_f = 5% (proxy for risk-free rate).
            Measures return per unit of risk. Sharpe &gt; 1 is generally considered good.
          </li>
          <li>
            <strong>Sortino Ratio</strong> — Like Sharpe, but only penalizes downside volatility (negative returns).
            More relevant for asymmetric distributions.
          </li>
          <li>
            <strong>Skewness</strong> — A positive skew means the distribution has a long right tail
            (more big upside outliers). Negative skew = more crash risk.
          </li>
          <li>
            <strong>Excess Kurtosis</strong> — Measures "fat tails." High kurtosis (&gt;0) means extreme
            events are more likely than a normal distribution would predict — common in financial markets.
          </li>
          <li>
            <strong>Beta (estimated)</strong> — Estimated relative to an assumed 18% market volatility.
            Beta &gt; 1 = more volatile than market. Simplified estimate without index data.
          </li>
          <li>
            <strong>Max Drawdown</strong> — Largest peak-to-trough decline in the 90-day historical price series.
          </li>
        </ul>
      </div>

      <div className="how-section">
        <h2>06 · DATA SOURCES & LIMITATIONS</h2>
        <ul>
          <li><strong>TwelveData API</strong> — Provides live OHLCV data for US, NSE (India), and BSE markets. 90-day daily candles are used for parameter estimation.</li>
          <li><strong>Finnhub API</strong> — Fallback data source for US stocks only.</li>
          <li><strong>News is AI-generated</strong>, not live-scraped. It is plausible but synthetic — educational only, not investment advice.</li>
          <li><strong>GBM assumes log-normal returns</strong> — This is a simplification. Real markets have fat tails, jumps, and stochastic volatility not captured here.</li>
          <li><strong>Indian stocks</strong> use NSE/BSE exchange suffixes. Prices are in Indian Rupees (₹).</li>
          <li><strong>Simulations are not predictions.</strong> Past volatility and historical drift are not guarantees of future performance.</li>
        </ul>
        <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(192,57,43,0.06)", border:"1px solid rgba(192,57,43,0.2)", fontSize:11, color:"var(--text2)", fontFamily:"var(--sans)", lineHeight:1.7 }}>
          ⚠ This tool is for educational and analytical purposes only. It does not constitute financial advice.
          All probability outputs are model-based estimates subject to model risk and parameter uncertainty.
        </div>
      </div>
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
        const cur = getCurrency(sym);
        return (
          <div key={sym} className={`ticker-item${selected===sym?" selected":""}`} onClick={()=>onSelect(sym)}>
            <span className="ticker-sym">{getDisplay(sym)}</span>
            {sym.includes(":NSE") && <span className="ticker-ex">NSE</span>}
            {sym.includes(":BSE") && <span className="ticker-ex">BSE</span>}
            <span className="ticker-price">{q ? cur+fmt(q.latest) : "…"}</span>
            <span className={`ticker-chg ${classChg(chg)}`}>{q ? fmtPct(chg) : "—"}</span>
            {q?.prices && <Sparkline prices={q.prices.slice(-20)} change={chg} width={44} height={16}/>}
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
  const keysOk = (TD_KEY || FH_KEY) && GROQ_KEY;

  const loadStock = useCallback(async (sym) => {
    if (!TD_KEY && !FH_KEY) return;
    setLoadingStock(true); setStockData(null);
    try {
      const data = await fetchStockData(sym);
      setStockData(data);
      setAllQuotes(q => ({ ...q, [sym]: data }));
    } catch(e) { console.error("loadStock:", e); }
    setLoadingStock(false);
  }, []);

  useEffect(() => {
    if (!TD_KEY && !FH_KEY) return;
    watchlist.forEach(sym => {
      fetchStockData(sym)
        .then(data => setAllQuotes(q => ({ ...q, [sym]: data })))
        .catch(() => {});
    });
  }, [watchlist.join(",")]);

  useEffect(() => { loadStock(symbol); }, [symbol, loadStock]);

  const handleSelectSymbol = useCallback((sym) => {
    setSymbol(sym);
    setPage("news");
  }, []);

  const PAGES = [
    { id:"news",        label:"NEWS" },
    { id:"simulation",  label:"SIMULATION" },
    { id:"probability", label:"PROBABILITY" },
    { id:"watchlist",   label:"WATCHLIST" },
    { id:"how",         label:"HOW IT WORKS" },
  ];

  return (
    <>
      <GlobalStyle/>
      <div className="page">
        <div className="nav">
          <div className="nav-brand">
            <span className="nav-logo">STOCKPROB</span>
            <span className="nav-version">PROB ENGINE v3.0</span>
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

        {/* Mobile nav */}
        <div className="mobile-tabs">
          {PAGES.map(p => (
            <button key={p.id} className={`mobile-tab${page===p.id?" active":""}`} onClick={()=>setPage(p.id)}>{p.label}</button>
          ))}
        </div>

        {!keysOk && <EnvBanner/>}

        {page !== "how" && (
          <>
            <div style={{ padding:"8px 36px", background:"var(--surface)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:8, color:"var(--text3)", fontFamily:"var(--mono)", letterSpacing:"0.16em" }}>SYMBOL</span>
              <StockSelector onSelect={handleSelectSymbol} currentSym={symbol}/>
              {stockData && !loadingStock && (
                <span style={{ fontSize:10, color:"var(--text2)", fontFamily:"var(--mono)" }}>
                  {getCurrency(symbol)}{fmt(stockData.latest)} · <span style={{ color:colorChg(stockData.change) }}>{fmtPct(stockData.change)}</span>
                </span>
              )}
              {loadingStock && <div className="loader" style={{ fontSize:9 }}><div className="loader-dots"><span/><span/><span/></div><span>Loading {getDisplay(symbol)}…</span></div>}
            </div>

            <TickerBar quotes={allQuotes} watchlist={watchlist} selected={symbol} onSelect={handleSelectSymbol}/>
          </>
        )}

        <div className="slide-in" key={page+symbol} style={{ paddingBottom: 60 }}>
          {page === "news"        && <NewsPage        symbol={symbol} stockData={stockData}/>}
          {page === "simulation"  && <SimulationPage  symbol={symbol} stockData={stockData}/>}
          {page === "probability" && <ProbabilityPage symbol={symbol} stockData={stockData}/>}
          {page === "watchlist"   && <WatchlistPage   watchlist={watchlist} setWatchlist={setWatchlist} allQuotes={allQuotes}/>}
          {page === "how"         && <HowItWorksPage/>}
        </div>
      </div>
    </>
  );
}
