# ARP Digital GPS Dashboard – Implementation Plan

## Context

ARP Digital facilitates remittance payments from UAE and Bahrain by converting sender funds to USDT, then to local currency via country partners. Their margin comes from the USDT premium over official USD rates in destination markets. This dashboard visualizes which corridors are most attractive (high remittance volume AND high USDT premium), ranked by a composite score, to help the strategy team prioritize expansion.

---

## Project Structure

```
arp-gps-dashboard/
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js           # Express server entry point
│   │   ├── routes/
│   │   │   └── corridors.js   # GET /api/corridors
│   │   ├── services/
│   │   │   ├── knomad.js      # Parse WB-KNOMAD.xlsx
│   │   │   ├── binance.js     # Fetch USDT P2P prices
│   │   │   ├── oanda.js       # Fetch official USD rates
│   │   │   └── score.js       # Composite score logic
│   │   └── data/
│   │       ├── WB-KNOMAD.xlsx # Copied from root
│   │       └── currencyMap.js # Country → ISO-4217 mapping
├── frontend/
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── WorldMap.jsx       # react-simple-maps choropleth
│       │   ├── Leaderboard.jsx    # Ranked corridor list (right panel)
│       │   ├── MarketsToggle.jsx  # UAE / Bahrain / All tabs
│       │   └── MetricToggle.jsx   # Composite / USDT Premium / Remittance
│       ├── hooks/
│       │   └── useCorridors.js    # Fetch + memoize API data
│       └── utils/
│           └── format.js          # Number formatting helpers
└── README.md
```

---

## Phase 1 – Backend

### 1.1 KNOMAD Parser (`knomad.js`)

- Use `xlsx` npm package to read `WB-KNOMAD.xlsx`, sheet `Data`
- Filter rows where `Economy Name` ∈ `{United Arab Emirates, Bahrain}`
- Exclude rows where `Partner` = `"WORLD"`
- Extract `Partner` (destination country name) and `2021` column (flow in USD millions)
- Convert millions → raw USD by multiplying ×1,000,000
- Output: array of `{ sender, destinationName, flowUSD }`
- Expected: ~28 corridors per sender

### 1.2 Country → Currency Mapping (`currencyMap.js`)

Static lookup table covering all ~28 KNOMAD partners per sender. Key decisions:

| Country | Currency | Notes |
|---|---|---|
| Egypt | EGP | |
| Pakistan | PKR | |
| India | INR | |
| Bangladesh | BDT | |
| Philippines | PHP | |
| Sri Lanka | LKR | |
| Nepal | NPR | |
| Indonesia | IDR | |
| Jordan | JOD | |
| Morocco | MAD | |
| Turkey | TRY | |
| Ethiopia | ETB | |
| Kenya | KES | |
| Ghana | GHS | |
| Nigeria | NGN | |
| Tanzania | TZS | |
| Uganda | UGX | |
| Sudan | SDG | May have no P2P data |
| Yemen | YER | May have no P2P data |
| Afghanistan | AFN | May have no P2P data |
| Myanmar | MMK | May have no P2P data |
| ... | ... | Document omissions in README |

Any country not in the map → flagged as `"No currency mapping"` in the response (excluded from composite scoring, surfaced in UI).

### 1.3 Binance P2P Service (`binance.js`)

- For each unique currency code, POST to `https://p2p.binance.com/bapi/c2c/v2/public/c2c/adv/quoted-price`
- Body: `{ assets: ["USDT"], fiatCurrency: CODE, tradeType: "SELL", fromUserRole: "USER" }`
- Extract `data[0].referencePrice` as a float — use this value directly, no averaging or adjustment
- If `data` is empty or `referencePrice` is null/missing → return `null` (not an error; treated as no P2P coverage)
- Run all currency requests in parallel (`Promise.allSettled`)
- Return map of `{ currencyCode → binancePrice | null }`

### 1.4 Official Rate Service (`oanda.js`)

- Use **Frankfurter API** (free, no key): `https://api.frankfurter.app/latest?from=USD&to=<CODES>`
- Batch all currencies in one request (comma-separated `to` parameter)
- Extract `rates[CODE]` for each currency
- If a code is not returned → treat as unavailable (`officialRate = null`)
- Return map of `{ currencyCode → officialRate | null }`

*Frankfurter is chosen over Oanda because it is free, requires no API key, and covers the needed currencies. This trade-off is documented in README.*

### 1.5 Premium Calculator and Scoring (`score.js`)

#### Premium (destination property)

For each corridor `c`:
```
premium_c = (binancePrice_c / officialRate_c) - 1
```

- If either `binancePrice_c` or `officialRate_c` is null → `premium_c = null`
- `premium_c` is a property of the **destination country**, not the sender. It does not change when the sender changes or when flows are summed across senders.

#### Null handling

- `premium_c = null` (Binance or Oanda missing) → `p2pStatus = "No P2P data available"`, corridor **excluded from ranking entirely** (do NOT impute 0)
- Currency mapping missing → `p2pStatus = "No currency mapping"`, corridor excluded from ranking entirely
- Corridors excluded from ranking are still returned in the API response so the UI can surface them explicitly

#### Composite Score

```
rawMargin_c = flowUSD_c × premium_c
```

Scoring steps (applied separately for each market filter — `UAE`, `Bahrain`, `All`):

1. Take only corridors with non-null `rawMargin_c` (i.e., premium is available)
2. Sort by `rawMargin_c` descending; assign rank 1 to the highest
3. Convert rank to percentile score over range [1, 100]:
   - If `n = 1`: `score = 100`
   - If `n > 1`: `score = round(((n - rank) / (n - 1)) × 99) + 1`
   - Result: top corridor → 100, bottom corridor → 1
4. Corridors excluded from ranking receive `score = null`

Score is pre-computed server-side for all three market views at startup.

### 1.6 "All" Market Aggregation Logic

The `All` market view represents combined flows from both UAE and Bahrain senders to each destination:

- **Flow aggregation**: for each unique destination, sum `flowUSD` across both senders. If a destination appears only under one sender, its flow is used as-is.
- **Premium**: the USDT premium is a **destination property** — it does not change based on the sender. The same `premium_c` applies regardless of which sender's flow is being combined.
- **rawMargin recomputed**: `rawMargin_c = summedFlowUSD_c × premium_c` (using the summed flow)
- **Scores re-ranked**: percentile scores are computed from scratch on the `All` set, so rankings differ from UAE-only or Bahrain-only views

### 1.7 API Route (`corridors.js`)

`GET /api/corridors`

Returns a single JSON object:
```json
{
  "UAE": [ { "destinationName": "...", "iso3": "...", "flowUSD": 0, "premium": 0, "rawMargin": 0, "score": 0, "p2pStatus": null } ],
  "Bahrain": [ ... ],
  "All": [ ... ]
}
```

Fields:
- `destinationName`: string, display name
- `iso3`: ISO 3166-1 alpha-3, used by react-simple-maps for geography matching
- `flowUSD`: numeric, raw dollars (already multiplied from millions)
- `premium`: numeric or `null`
- `rawMargin`: numeric or `null`
- `score`: integer [1,100] or `null` if excluded from ranking
- `p2pStatus`: `null` (data available) | `"No P2P data available"` | `"No currency mapping"`

Notes:
- Data is fetched fresh at server startup; no scheduled refresh
- Startup fetches all external APIs concurrently, then the Express server begins listening

---

## Phase 2 – Frontend

### 2.1 Data Fetching Hook (`useCorridors.js`)

- `fetch('/api/corridors')` on mount
- Returns `{ data, loading, error }`
- `data` shape mirrors the API response above

### 2.2 App State (`App.jsx`)

State:
- `market`: `"UAE" | "Bahrain" | "All"` (default: `"All"`)
- `metric`: `"composite" | "premium" | "remittance"` (default: `"composite"`)

Derived:
- `activeCorridors = data[market]` → array for current market
- Passed to both `WorldMap` and `Leaderboard`

Layout: two-column flex layout — map fills the left (majority of viewport width), leaderboard is a fixed-width panel on the **right side**. Toggles appear above the map.

### 2.3 World Map (`WorldMap.jsx`)

- Library: **react-simple-maps** with `ComposableMap` + `Geographies`
- GeoJSON source: built-in world-110m TopoJSON (bundled with react-simple-maps)
- Color scale: `d3-scale` `scaleSequential`
  - Composite Score: orange scale (`interpolateOranges`), domain [1, 100]
  - USDT Premium: blue scale (`interpolateBlues`), domain [0, max_premium]
  - Remittance: green scale (`interpolateGreens`), domain [0, max_flow]
- Countries not in corridor list: neutral gray (`#D6D6DA`)
- Countries with `p2pStatus = "No P2P data available"`: distinct light gray or hatched styling to signal presence-but-no-data
- On hover: tooltip showing country name and metric value
- Geography matching: `geography.properties.ISO_A3` vs corridor `iso3`
- **IMPORTANT**: No numbers, labels, or text are rendered directly on the map. All quantitative data is shown only in the leaderboard panel and tooltip on hover.

### 2.4 Leaderboard (`Leaderboard.jsx`)

- Position: fixed-width panel on the **right side** of the viewport
- Sorted by selected metric descending
  - Composite: by `score` descending
  - USDT Premium: by `premium` descending
  - Remittance: by `flowUSD` descending
- Corridors with valid data ranked and numbered starting at 1
- Corridors with `p2pStatus` set are shown at the bottom, below all ranked entries, with the `p2pStatus` string displayed instead of a metric value (e.g., "No P2P data available")
- Format via `format.js`:
  - Composite: integer e.g. `87`
  - Premium: `(premium * 100).toFixed(1) + "%"` e.g. `14.3%`
  - Remittance: `$` + magnitude suffix e.g. `$1.8B`, `$433M`, `$12K`

### 2.5 Toggles

- `MarketsToggle`: three buttons `UAE | Bahrain | All`, active state highlighted
- `MetricToggle`: three buttons `Composite Score | USDT Premium | Remittance Outflow`, active state highlighted
- Both are purely presentational, lift state to `App.jsx`

### 2.6 Color Legend

- Horizontal gradient bar below or beside the map, labeled `low` → `high`
- Updates color scale and domain when metric or market changes

---

## Phase 3 – Data & Edge Cases

### Edge Case Matrix

| Scenario | Handling |
|---|---|
| Binance P2P returns empty `data` array | `premium = null`, corridor excluded from ranking, shown as "No P2P data available" in leaderboard |
| Binance P2P `referencePrice` is null/missing | Same as above |
| Frankfurter does not return a rate for a currency | `officialRate = null`, same as above |
| Country not in currencyMap | `p2pStatus = "No currency mapping"`, excluded from ranking |
| Only 1 valid corridor (n=1) | Score = 100 (division-by-zero guard required in formula) |
| `All` market: destination appears in only one sender | Use that sender's flow; premium unchanged (destination property) |
| `All` market: destination appears in both senders | Sum the flows; premium unchanged (destination property); recompute rawMargin on summed flow |
| Negative premium (USDT trades at discount) | Included in ranking; rawMargin may be negative; score reflects low attractiveness |
| All corridors for a market have null premium | Return empty ranked list; all shown as "No P2P data available" |

### Country Name → ISO3 Mapping

A second static map is required: `KNOMAD partner name → ISO 3166-1 alpha-3`, used for map rendering in react-simple-maps. Examples: `"United States" → "USA"`, `"Egypt" → "EGY"`. This map should live alongside `currencyMap.js` as `iso3Map.js`.

---

## Phase 4 – Configuration & Wiring

### Backend `package.json` scripts
- `npm start` → runs `node src/index.js` (fetches data then starts server on port 3001)

### Frontend `package.json` scripts
- `npm start` → Vite dev server on port 5173, proxy `/api` → `localhost:3001`
- `npm run build` → production build

### Environment
- No `.env` required (all APIs are public/unauthenticated)
- Frankfurter API base URL hardcoded in `oanda.js`

---

## Phase 5 – README.md

Sections:
1. **Setup & Run** – `npm install` in both `backend/` and `frontend/`, then `npm start` in each. List prerequisites (Node.js version, etc.)
2. **Architecture** – brief description of data flow: KNOMAD → backend services → `/api/corridors` → React frontend
3. **How AI Was Used** – honest description of how Claude Code (or other AI tools) assisted: planning, scaffolding code, reviewing formulas, writing tests, debugging. Include which parts were AI-generated vs human-written and any errors AI made that required correction.
4. **Trade-offs & Shortcuts**
   - Frankfurter instead of Oanda (free, no key required; note it may lack coverage for some exotic currencies)
   - Data fetched once on startup, not refreshed (acceptable for a one-off analysis tool)
   - ~28 corridors covered; documented omissions in currencyMap
   - react-simple-maps chosen for simplicity over Mapbox/Leaflet
   - Scores pre-computed server-side for all three market views at startup
5. **Known Omissions** – list any currencies not mappable or lacking P2P coverage (e.g., Sudan SDG, Yemen YER, Afghanistan AFN)

---

## Verification Checklist

- [ ] Backend starts and logs fetched corridors count (~28 UAE, ~28 Bahrain)
- [ ] `GET /api/corridors` returns valid JSON with `UAE`, `Bahrain`, `All` keys
- [ ] `All` market sums flows correctly for destinations appearing in both senders
- [ ] `All` scores differ from `UAE`/`Bahrain` scores (re-ranked on summed flows)
- [ ] Premium values are identical across UAE, Bahrain, and All for the same destination
- [ ] Top composite scorer in each market gets score = 100, bottom ranked gets score = 1
- [ ] Corridors with null premium are excluded from ranking (score = null), NOT assigned score = 0
- [ ] Those corridors appear in API response with `p2pStatus = "No P2P data available"`
- [ ] Leaderboard is on the RIGHT side of the page
- [ ] No numbers or labels appear directly on the map (only colors)
- [ ] Hovering a country shows tooltip with name and metric value
- [ ] Countries with no P2P data shown with distinct styling on map and "No P2P data available" label in leaderboard
- [ ] Markets toggle switches data correctly; leaderboard re-sorts
- [ ] Metric toggle changes map color scale, leaderboard sort order, and value formatting
- [ ] Remittance values formatted with B/M/K suffix correctly
- [ ] Premium shown as X.X% (one decimal)
- [ ] Composite score shown as integer [1, 100]
- [ ] README includes "How AI Was Used" section
- [ ] No console errors in browser
