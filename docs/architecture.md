# Architecture

## Overview

A full-stack dashboard that ranks remittance corridors from the UAE and Bahrain by USDT P2P arbitrage opportunity. The backend runs a one-shot data pipeline at startup; all data is served from memory thereafter.

## System Diagram

```
┌──────────────────────────────────────────────────────┐
│                     BACKEND (Node.js :3001)          │
│                                                      │
│  WB-KNOMAD.xlsx                                      │
│       │                                              │
│  knomad.js  ──→  ~60 corridors (sender + dest + USD) │
│       │                                              │
│       ├─── [parallel] ──→  binance.js                │
│       │                    Binance P2P USDT SELL      │
│       │                    prices per currency        │
│       │                                              │
│       └─── [parallel] ──→  oanda.js                  │
│                            open.er-api.com official  │
│                            USD rates per currency    │
│                                   │                  │
│                            score.js                  │
│                            premium = (P2P/official)−1│
│                            rawMargin = flowUSD×premium│
│                            score = percentile [1,100] │
│                                   │                  │
│                    { UAE, Bahrain, All }              │
│                    cached in memory                  │
│                           │                          │
│                    GET /api/corridors                │
└───────────────────────────┼──────────────────────────┘
                            │ JSON
┌───────────────────────────┼──────────────────────────┐
│              FRONTEND (Vite/React :5173)             │
│                           │                          │
│  useCorridors.js  ─────────┘                         │
│       │                                              │
│  App.jsx  (market × metric state)                    │
│   ├── WorldMap.jsx  (choropleth, d3 color scales)    │
│   └── Leaderboard.jsx  (ranked table)                │
└──────────────────────────────────────────────────────┘
```

## Data Pipeline

Runs once at server startup (`backend/src/index.js → fetchAllData()`).

### Step 1 — KNOMAD parse (`knomad.js`)

Reads `backend/src/data/WB-KNOMAD.xlsx`, sheet `"Data"`. Filters:
- **Sender:** United Arab Emirates or Bahrain only
- **Indicator:** bilateral remittance estimates (USD million)
- **Year:** 2021
- **Partner:** excludes `WORLD` and empty rows

Outputs ~60 `{ sender, destinationName, flowUSD }` objects.

### Step 2 — Price fetch (parallel)

**`binance.js`** — POST to Binance P2P quoted-price API for each destination currency (`tradeType: SELL`, `asset: USDT`). Extracts `referencePrice`. Supports HTTP proxy via env vars.

**`oanda.js`** — GET `https://open.er-api.com/v6/latest/USD`. Returns rates relative to USD. ECB/Frankfurter was rejected because it covers only ~30 major currencies; open.er-api.com covers EGP, PKR, BDT, NGN, LBP, etc.

### Step 3 — Currency mapping (`currencyMap.js`)

Static hand-curated map: `KNOMAD country name → { currencyCode, iso3 }`. New KNOMAD destinations require a manual entry here.

### Step 4 — Scoring (`score.js`)

```
premium    = (binancePrice / officialRate) − 1
rawMargin  = flowUSD × premium
score      = percentile rank of rawMargin within market, scaled to [1, 100]
```

Percentile formula (0-indexed rank, descending):
```
score = ((n − rank) / (n − 1)) × 99 + 1
```
- Top corridor → 100, bottom valid corridor → 1
- `n === 1` → hardcoded 100 (avoids division by zero)
- Corridors with null rawMargin (no P2P data) → score = null, sorted to bottom

### Step 5 — Market views

Three pre-computed slices served from memory:
- **UAE** — corridors where sender = UAE
- **Bahrain** — corridors where sender = Bahrain
- **All** — flowUSD aggregated by destination across both senders, then re-scored

## Frontend State

`App.jsx` owns two state variables:

| State    | Values                                    |
|----------|-------------------------------------------|
| `market` | `'All'` \| `'UAE'` \| `'Bahrain'`         |
| `metric` | `'composite'` \| `'premium'` \| `'remittance'` |

`activeCorridors = data[market]` is passed to both `WorldMap` and `Leaderboard`.

## Key Constraints

| Constraint | Detail |
|---|---|
| Static currency map | `currencyMap.js` is hand-curated; new destinations require manual additions |
| No refresh | Data fetched once at startup; restart backend to update prices |
| CommonJS / ESM split | Backend uses `require`/`module.exports`; frontend uses `import`/`export` |
| Sanity bounds | `calculatePremium` returns null if premium > 500% (filters stale/bad data) |
| Single API for FX | open.er-api.com (free, no key required, broad currency coverage) |
