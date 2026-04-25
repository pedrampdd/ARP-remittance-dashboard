# ARP Digital GPS Dashboard

A strategy dashboard that ranks remittance corridors from UAE and Bahrain by a composite opportunity score, combining remittance volume (World Bank KNOMAD) with USDT premium over official USD rates (Binance P2P vs. Frankfurter/ECB).

---

## Setup & Run

### Prerequisites
- Node.js 14+
- npm

### Backend

```bash
cd backend
npm install
npm start
```

The backend will:
1. Parse `WB-KNOMAD.xlsx` for UAE and Bahrain remittance flows
2. Fetch live USDT P2P prices from Binance for each destination currency
3. Fetch official USD rates from Frankfurter API
4. Compute composite scores and start listening on **port 3001**

### Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Vite proxies `/api` requests to `localhost:3001` automatically.

---

## Architecture

```
Browser (React + Vite)
  │
  ├── MarketsToggle  → UAE / Bahrain / All
  ├── MetricToggle   → Composite / USDT Premium / Remittance
  ├── WorldMap       → react-simple-maps choropleth
  └── Leaderboard    → ranked corridor table
          │
          │  GET /api/corridors
          ▼
  Express (Node.js) on :3001
          │
          ├── knomad.js     → reads WB-KNOMAD.xlsx (sheet "Data")
          ├── binance.js    → POST Binance P2P for USDT prices
          ├── oanda.js      → GET Frankfurter for official USD rates
          └── score.js      → premium + composite score computation
```

**Data flow:**
1. Backend parses KNOMAD data → ~28 corridors per sender
2. Currency codes resolved via static `currencyMap.js`
3. Binance P2P prices fetched in parallel for each unique currency
4. Frankfurter rates fetched in one batched request
5. `premium = (binancePrice / officialRate) - 1`
6. `rawMargin = flowUSD × premium`
7. `score` = percentile rank of rawMargin within market, scaled to [1, 100]
8. Three market views computed: UAE-only, Bahrain-only, All (summed flows)

---

## AI Usage

This project was built with **Claude Code (Sonnet 4.6)**:

- **Planning**: Claude generated the full implementation plan (see `plan.md`), including the data model, scoring formula, edge case matrix, and component structure.
- **Scaffolding**: All backend services, routes, and frontend components were scaffolded by Claude with the plan as specification.
- **Review**: Claude reviewed the generated code for edge case handling (null P2P data, missing currency mappings, n=1 scoring) and consistency between backend output shape and frontend consumption.

Human decisions:
- Confirmed the scoring formula (percentile rank → [1, 100])
- Chose `react-simple-maps` over Mapbox for simplicity
- Confirmed Frankfurter as the official rate source

---

## Trade-offs & Shortcuts

| Decision | Rationale |
|---|---|
| **open.er-api.com instead of OANDA/Frankfurter** | Free, no API key, covers ~170 currencies including EGP/PKR/BDT/NGN/LBP/etc. Frankfurter (ECB) only covers ~30 major currencies and would have excluded most corridors. |
| **Data fetched once on startup** | Per spec: no scheduled refresh. Restart the server to get fresh prices. |
| **Static currency map** | ~28 corridors, hand-curated. Any new KNOMAD corridors need a manual update. |
| **react-simple-maps** | Built-in world TopoJSON, zero config, sufficient for choropleth. Mapbox/Leaflet would add auth complexity. |
| **Scores computed server-side** | Avoids re-ranking on every frontend state change; the three market views are pre-scored. |

---

## Known Omissions

The following currencies may have **no Binance P2P coverage** (will show as "No P2P data"):

| Country | Currency | Notes |
|---|---|---|
| Sudan | SDG | Rarely traded on Binance P2P |
| Yemen | YER | Restricted market |
| Afghanistan | AFN | Restricted market |
| Myanmar | MMK | May have limited liquidity |
| Laos | LAK | Low volume |
| Cambodia | KHR | Low volume |

Countries **not in the currency map** will be flagged as "No mapping":
- Any KNOMAD destination not covered by `currencyMap.js` is excluded from scoring but still surfaced in the API response for transparency.

---

## Verification Checklist

- [ ] Backend starts and logs ~28 corridors for UAE and ~28 for Bahrain
- [ ] `GET /api/corridors` returns `{UAE, Bahrain, All}` keys with corridor arrays
- [ ] `All` scores differ from `UAE` / `Bahrain` (recomputed on summed flows)
- [ ] Top scorer in each market has `score = 100`, bottom has `score = 1`
- [ ] Countries with null P2P shown with "No P2P data" label at bottom of leaderboard
- [ ] World map highlights destination countries; non-destinations are neutral gray
- [ ] Markets toggle switches active corridors; leaderboard and map update
- [ ] Metric toggle changes map color scale and leaderboard sort order
- [ ] Hover tooltip shows country name + current metric value
- [ ] Remittance values use B/M/K suffix correctly
- [ ] Premium values shown as X.X% (one decimal)
- [ ] No console errors in browser
