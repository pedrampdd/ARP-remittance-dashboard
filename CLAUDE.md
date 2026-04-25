# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### One-liner (recommended)
```bash
make dev      # installs deps + starts both servers in parallel (Ctrl+C stops both)
make install  # install deps only
make stop     # kill running servers
```

### Backend (port 3001)
```bash
cd backend && npm start        # fetches all live data at startup, then serves
cd backend && npm test         # run all backend Jest tests
cd backend && npx jest --testPathPattern=score  # run a single test file by name
```

### Frontend (port 5173)
```bash
cd frontend && npm run dev     # Vite dev server with /api proxy to :3001
cd frontend && npm test        # run all frontend unit tests (Vitest)
cd frontend && npm run build   # production build to frontend/dist/
```

### E2E Tests (Playwright)
```bash
cd frontend && npx playwright test                       # run all e2e tests
cd frontend && npx playwright test --grep "leaderboard"  # run a single test by name
```
Playwright auto-starts both servers (`reuseExistingServer: true` reuses already-running ones). The config hardcodes a Chrome path at `/home/pedram/.cache/puppeteer/chrome/`.

Frontend unit tests use **Vitest** (configured in `vite.config.js`); E2E tests use **Playwright** (`frontend/e2e/`). Backend tests use **Jest**.

## Architecture

### Data Pipeline (backend, runs once at startup)

`pipeline.js` orchestrates the 4-step startup sequence:

```
WB-KNOMAD.xlsx  →  knomad.js   (parse "Data" sheet, ~28 corridors per sender)
                                          ↓
currencyMap.js  (static map: country name → ISO currency code + ISO-3)
                                          ↓
         [parallel] binance.js  →  Binance P2P USDT SELL price per currency
         [parallel] oanda.js    →  open.er-api.com official USD rates (not Frankfurter/ECB)
                                          ↓
score.js  →  premium = (binancePrice / officialRate) - 1
             rawMargin = flowUSD × premium
             score = percentile rank within market, scaled to [1, 100]
                                          ↓
Three pre-computed market views:  { UAE, Bahrain, All }
  "All" aggregates flowUSD by destination across both senders before scoring.
```

All data is cached in-memory after startup. Restart the server to refresh prices.

`request.js` is a shared HTTP helper used by `binance.js` and `oanda.js`.

### API

`GET /api/corridors` → `{ UAE: [...], Bahrain: [...], All: [...] }`

Each corridor object: `sender`, `destinationName`, `iso3`, `currencyCode`, `flowUSD`, `binancePrice`, `officialRate`, `premium`, `rawMargin`, `score`, `p2pStatus` (`"OK"` | `"No P2P data"` | `"No currency mapping"`).

### Frontend

- `App.jsx` — owns `market` (`UAE`/`Bahrain`/`All`) and `metric` (`composite`/`premium`/`remittance`) state; slices `data[market]` into `activeCorridors`
- `useCorridors.js` — single fetch hook, returns `{ data, loading, error }`
- `MarketsToggle.jsx` / `MetricToggle.jsx` — controlled toggle button groups; receive state + setter as props
- `WorldMap.jsx` — react-simple-maps choropleth; colors countries by selected metric; shows `.map-tooltip` on hover
- `Leaderboard.jsx` — ranked table; corridors with `score === null` rendered as `.leaderboard-row.no-data` at the bottom
- `format.js` — shared formatting utilities (B/M/K suffixes, percentage display)

Test files mirror source layout under `src/tests/` (e.g., `src/tests/services/score.test.js` mirrors `src/services/score.js`).

### Key Constraints

- **Static currency map**: `backend/src/data/currencyMap.js` is hand-curated. New KNOMAD destinations require manual entries.
- **Backend is CommonJS** (`require`/`module.exports`); **frontend is ES modules** (`import`/`export`).
- **No scheduled refresh**: data is fetched once. Restart the backend to get fresh prices.
- **Scoring edge case**: when `n === 1` valid corridor, score is hardcoded to 100 (avoids division by zero in percentile formula).
- **open.er-api.com** is used instead of Frankfurter/ECB because ECB only covers ~30 major currencies, excluding most corridors (EGP, PKR, BDT, NGN, LBP, etc.).
