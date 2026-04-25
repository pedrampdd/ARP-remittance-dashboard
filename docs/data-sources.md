# Data Sources

## Remittance flows — World Bank KNOMAD

**File:** `backend/src/data/WB-KNOMAD.xlsx`  
**Sheet:** `Data`  
**Vintage:** 2021 estimates

The World Bank KNOMAD bilateral remittance matrix provides estimates of USD remittance flows between country pairs. This project uses flows sent from the UAE and Bahrain to ~30 destination countries each.

**Indicator used:**
> Bilateral Remittance Estimates using Migrant Stocks, Host Country Incomes, and Origin Country Incomes (US$ million)

Values are in USD millions; the pipeline multiplies by 1,000,000 for absolute USD.

Source: [World Bank KNOMAD](https://www.knomad.org/data/remittances)

---

## P2P USDT prices — Binance

**Endpoint:** `https://p2p.binance.com/bapi/c2c/v2/public/c2c/adv/quoted-price`  
**Method:** POST  
**Parameters:** `assets: ['USDT'], fiatCurrency: <code>, tradeType: 'SELL'`

Fetches the reference USDT sell price in local fiat for each destination currency. "SELL" reflects the rate at which a remittance sender would sell USDT and receive local currency.

**Limitations:**
- Not all currencies have active Binance P2P markets (results in `"No P2P data"` status)
- Reference price reflects market conditions at time of server startup only
- Prices for illiquid currencies may be stale or sparse

---

## Official FX rates — open.er-api.com

**Endpoint:** `https://open.er-api.com/v6/latest/USD`  
**Auth:** None (free tier)

Returns daily USD-based exchange rates for ~160+ currencies.

**Why not ECB/Frankfurter?** ECB covers only ~30 major currencies. Most remittance corridors (EGP, PKR, BDT, NGN, LBP, etc.) are excluded. open.er-api.com provides the broadest free coverage.

**Limitations:**
- Rates update once daily; intraday movements are not captured
- Rates for heavily controlled currencies (e.g. LBP) reflect the official peg, not the parallel market rate — this can make the computed premium appear artificially high

---

## Currency mapping — `currencyMap.js`

**File:** `backend/src/data/currencyMap.js`

Maps KNOMAD country names (which don't always match ISO standard names) to ISO 4217 currency codes and ISO 3166-1 alpha-3 codes. This map is hand-curated and must be updated manually when new destinations appear in the KNOMAD data.

**Known edge cases:**

| KNOMAD name | Currency | Notes |
|---|---|---|
| West Bank and Gaza | ILS | Uses Israeli new shekel as de-facto currency |
| Egypt, Arab Rep. | EGP | KNOMAD uses this verbose form |
| Somalia | SOS | Thin P2P market; likely `"No P2P data"` |
| South Sudan | SSP | Very thin P2P market |
| Sudan | SDG | Subject to sanctions; may be unavailable |
| Myanmar | MMK | P2P availability varies |

---

## Premium interpretation

```
premium = (binancePrice / officialRate) − 1
```

| Premium range | Interpretation |
|---|---|
| Negative | P2P price below official rate; arbitrage not favorable |
| 0–20% | Typical corridor spread |
| 20–50% | High opportunity; active P2P market, controlled official rate |
| > 100% | Likely data quality issue (stale official rate or thin P2P) — flagged with ⚠ in UI |
| null | Missing Binance price or official rate; corridor excluded from scoring |

Premiums exceeding 500% are filtered by a sanity bound in `calculatePremium` and returned as null.
