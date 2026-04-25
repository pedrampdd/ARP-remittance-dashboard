# API Reference

Base URL (development): `http://localhost:3001`

## Endpoints

### `GET /api/corridors`

Returns all pre-computed corridor data grouped by market.

**Response**

```json
{
  "UAE": [ /* corridor objects, sorted by score descending */ ],
  "Bahrain": [ /* corridor objects, sorted by score descending */ ],
  "All": [ /* aggregated corridors, sorted by score descending */ ]
}
```

**Corridor object**

| Field | Type | Description |
|---|---|---|
| `sender` | `string` | Sending country (`"United Arab Emirates"` or `"Bahrain"`) |
| `destinationName` | `string` | Destination country name (from KNOMAD) |
| `iso3` | `string \| null` | ISO 3166-1 alpha-3 country code |
| `currencyCode` | `string \| null` | ISO 4217 currency code |
| `flowUSD` | `number` | Bilateral remittance flow in USD (2021) |
| `binancePrice` | `number \| null` | Binance P2P USDT SELL reference price in destination currency |
| `officialRate` | `number \| null` | Official USD→destination currency rate (open.er-api.com) |
| `premium` | `number \| null` | `(binancePrice / officialRate) − 1` — e.g. `0.12` = 12% |
| `rawMargin` | `number \| null` | `flowUSD × premium` in USD |
| `score` | `number \| null` | Composite opportunity score, 1–100 (percentile of rawMargin) |
| `p2pStatus` | `string` | `"OK"` \| `"No P2P data"` \| `"No currency mapping"` |

**`p2pStatus` values**

| Value | Meaning |
|---|---|
| `"OK"` | Both Binance and official rate found; premium calculated |
| `"No P2P data"` | Binance or official rate missing for this currency |
| `"No currency mapping"` | Country not in `currencyMap.js`; no currency code known |

**Score interpretation**

| Score | Meaning |
|---|---|
| 100 | Highest rawMargin in this market view |
| 1 | Lowest rawMargin in this market view |
| `null` | No valid P2P data; corridor excluded from ranking |

**Caveats**
- Premium > 100% may indicate stale official exchange rate data
- Negative premium means the P2P price is below the official rate
- USD-destination corridors (e.g. USA) show P2P USDT/USD dynamics, not FX gaps
- `"All"` market aggregates `flowUSD` by destination before scoring; individual sender rows are merged

---

### `GET /health`

Liveness probe.

**Response**

```json
{ "status": "ok" }
```

Returns `503` with `{ "status": "loading" }` while the data pipeline is still running at startup.
