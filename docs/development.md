# Development Guide

## Prerequisites

- Node.js ≥ 18 (LTS recommended)
- npm ≥ 9

## Setup

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

## Running locally

Start both servers in separate terminals:

```bash
# Terminal 1 — backend (fetches live data at startup, takes ~10–30s)
cd backend && npm start

# Terminal 2 — frontend dev server
cd frontend && npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` to `:3001`.

> **Note:** The backend fetches Binance P2P and exchange rate data once at startup. Restart the backend server to refresh prices.

## Environment variables

| Variable | Purpose |
|---|---|
| `http_proxy` / `https_proxy` | HTTP proxy for backend API calls (Binance P2P, open.er-api.com) |
| `PORT` | Override backend port (default: `3001`) |

## Project structure

```
ARP_task/
├── backend/
│   ├── src/
│   │   ├── index.js           # Server entry point, data pipeline orchestration
│   │   ├── data/
│   │   │   ├── WB-KNOMAD.xlsx # World Bank bilateral remittance data (2021)
│   │   │   └── currencyMap.js # Country name → ISO currency code + ISO-3
│   │   ├── routes/
│   │   │   └── corridors.js   # GET /api/corridors handler
│   │   ├── services/
│   │   │   ├── binance.js     # Binance P2P price fetcher
│   │   │   ├── knomad.js      # KNOMAD Excel parser
│   │   │   ├── oanda.js       # open.er-api.com FX rate fetcher
│   │   │   └── score.js       # Premium, margin, and score calculations
│   │   └── tests/
│   │       ├── currencyMap.test.js
│   │       └── score.test.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Root component (market + metric state)
│   │   ├── main.jsx           # React entry point
│   │   ├── index.css          # Global styles
│   │   ├── components/
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── WorldMap.jsx
│   │   │   ├── MarketsToggle.jsx
│   │   │   └── MetricToggle.jsx
│   │   ├── hooks/
│   │   │   └── useCorridors.js
│   │   ├── utils/
│   │   │   └── format.js
│   │   └── tests/
│   │       ├── setup.js
│   │       ├── format.test.js
│   │       ├── Leaderboard.test.jsx
│   │       ├── MarketsToggle.test.jsx
│   │       └── MetricToggle.test.jsx
│   ├── e2e/
│   │   └── dashboard.spec.cjs # Playwright E2E tests
│   ├── vite.config.js
│   └── package.json
└── docs/                      # This folder
```

## Testing

### Unit tests — backend

```bash
cd backend && npm test
```

Uses Jest. Test files in `backend/src/tests/`. Covers `score.js` (calculatePremium, enrichCorridors, rankAndScore) and `currencyMap.js`.

### Unit tests — frontend

```bash
cd frontend && npm test
```

Uses Vitest + jsdom + Testing Library. Test files in `frontend/src/tests/`. Covers formatting utilities and UI components.

### E2E tests

```bash
cd frontend && npx playwright test

# Run a single test
cd frontend && npx playwright test --grep "leaderboard"
```

Playwright auto-starts both servers (reuses if already running). Chrome binary is expected at `/home/pedram/.cache/puppeteer/chrome/`.

## Production build

```bash
cd frontend && npm run build   # output to frontend/dist/
```

Serve `frontend/dist/` with any static file server, proxying `/api/*` to the backend.

## Adding a new KNOMAD destination

1. Find the country's ISO 4217 currency code and ISO 3166-1 alpha-3 code.
2. Add an entry to `backend/src/data/currencyMap.js`:

```js
'Country Name As In KNOMAD': { currencyCode: 'XYZ', iso3: 'XYZ' },
```

3. Restart the backend — the pipeline re-runs on startup.
