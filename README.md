# STOCKPROB — Probability Engine v2.0

> AI-powered Monte Carlo stock probability engine · GBM simulation · Groq LLaMA 3.3 sentiment · Markov regime transitions

![STOCKPROB](https://img.shields.io/badge/STOCKPROB-v2.0-ff4422?style=flat-square&labelColor=07080a)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)

---

## Features

| Tab | What it does |
|---|---|
| **NEWS** | Generates 8 AI-synthesized headlines via Groq LLaMA 3.3-70b, extracts sentiment score, drift adjustment, and vol multiplier |
| **SIMULATION** | Runs 600-path Monte Carlo GBM simulation with Markov chain regime transitions + AI-adjusted parameters; renders price path fan and final price distribution |
| **PROBABILITY** | Full probabilistic forecast: P(up), P(±5%), P(±10%), VaR 95%, Sharpe ratio, median target, expected return — 1000-path MC |
| **WATCHLIST** | Multi-symbol tracker with sparklines; batch-run 30D MC simulations across your full watchlist; sortable risk table |

---

## Tech Stack

- **React 18 + Vite 5** — frontend
- **Twelve Data API** — live OHLCV time-series (90d history)
- **Groq API (LLaMA 3.3-70b-versatile)** — news generation + sentiment analysis
- **Canvas API** — custom Monte Carlo fan chart + distribution histogram
- **Vercel** — hosting + CI/CD

---

## Vercel Deployment (5 min)

### Step 1 — Get API Keys

#### Twelve Data (free)
1. Go to [twelvedata.com](https://twelvedata.com)
2. Click **Get your API key** → sign up
3. Copy your key from the dashboard  
   Free tier: **800 API calls/day** (plenty for personal use)

#### Groq (free)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign in with Google/GitHub
3. Navigate to **API Keys → Create API Key**
4. Copy the key (starts with `gsk_...`)  
   Free tier: **30 req/min, 14,400 req/day**

---

### Step 2 — Deploy to Vercel

#### Option A: One-click via Vercel CLI
```bash
npm i -g vercel
cd stockprob
vercel
```

#### Option B: GitHub import
1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repo → Vercel auto-detects Vite

---

### Step 3 — Set Environment Variables in Vercel

In your Vercel project dashboard:

1. Go to **Settings → Environment Variables**
2. Add the following:

| Variable Name | Value | Environment |
|---|---|---|
| `VITE_TWELVEDATA_KEY` | `your_twelvedata_api_key` | Production, Preview, Development |
| `VITE_GROQ_KEY` | `gsk_your_groq_key` | Production, Preview, Development |

> ⚠️ **Important:** Variable names must start with `VITE_` to be exposed to the browser by Vite.

3. Click **Save** → trigger a **Redeploy** (Deployments → ⋯ → Redeploy)

---

## Local Development

```bash
# 1. Clone / unzip the project
cd stockprob

# 2. Install dependencies
npm install

# 3. Create local env file
cp .env.example .env.local
# Edit .env.local and fill in your keys

# 4. Start dev server
npm run dev
# → http://localhost:5173
```

---

## Project Structure

```
stockprob/
├── src/
│   ├── main.jsx          # React entry point
│   └── App.jsx           # Entire application (all pages + logic)
├── index.html            # HTML shell
├── vite.config.js        # Vite config
├── vercel.json           # Vercel routing + cache headers
├── package.json
├── .env.example          # ← copy this to .env.local
└── README.md
```

---

## How the Math Works

### Geometric Brownian Motion (GBM)
```
dS = μS dt + σS dW
```
- **μ** (drift) — estimated from 90-day annualized log-return mean, adjusted by AI sentiment
- **σ** (volatility) — estimated from 90-day annualized log-return std dev, scaled by AI vol multiplier
- **dW** — Wiener process increment ~ N(0, dt)

### Markov Chain (3-state)
Returns are classified into Bear (r < −0.5%), Neutral, Bull (r > +0.5%) states.  
A 3×3 transition matrix is estimated from historical state sequences to model regime persistence.

### Monte Carlo
600–1000 GBM paths simulated over the selected horizon.  
`P(up) = count(final_price > S0) / total_paths`

### VaR 95%
Worst-case loss at the 5th percentile of the final price distribution.

### Sharpe Ratio
`Sharpe = (μ − r_f) / σ` where `r_f = 5%` (risk-free rate proxy).

---

## Notes

- **News is AI-generated** (not live scraped) — Groq synthesizes plausible headlines given the symbol and year context. This is for educational/demo purposes.
- **Prices are live** from Twelve Data's free tier.
- Free Twelve Data tier rate-limits to ~8 req/min; if you have multiple symbols loading simultaneously, some may show "—" briefly then update.

---

## License

MIT — do whatever you want with it.
