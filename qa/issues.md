# QA Report — ARP Digital GPS Dashboard
**Tested against:** ARP Take-Home Assignment PDF spec
**Date:** 2026-04-25
**Tester:** Claude (Playwright automation + manual verification)
**App:** `http://localhost:5173` (frontend) + `http://localhost:3001` (backend)

---

## Summary

| Category | Status |
|---|---|
| Markets toggle (UAE / Bahrain / All) | ✅ PASS |
| Metric toggle (Composite / USDT Premium / Remittance) | ✅ PASS |
| World map heatmap (3 color scales) | ✅ PASS |
| No numbers on map | ✅ PASS |
| Leaderboard sorting per metric | ✅ PASS |
| Composite score math | ✅ PASS |
| Flow aggregation (All = UAE + Bahrain) | ✅ PASS |
| Premium formula (binance/official − 1) | ✅ PASS |
| No P2P data handling | ✅ PASS |
| Hover tooltip (per metric) | ✅ PASS |
| Number formatting | ✅ PASS |
| Subtitle updates with market/metric | ✅ PASS |
| ~28 corridors per sender | ✅ PASS (28 each: 24 scored + 4 No P2P) |
| WORLD row excluded | ✅ PASS |

**No critical bugs found.** Issues below are data-quality concerns and minor UX gaps.

---

## Issues

### 🟡 MEDIUM — Sudan 727% Premium May Be Unreliable Data

**Symptom:** Sudan (SDG) shows a 727.1% USDT premium — by far the highest in the dataset. This pushes Sudan to #2 composite score ($112M flow × 7.27 = $814M raw margin), above far larger corridors like Egypt ($8.9B flow) and Pakistan ($6.5B flow).

**Root cause:** Binance P2P shows `4,231 SDG/USDT` while the official rate from open.er-api.com is `511 SDG/USD`. Sudan's official rate is a controlled/legacy rate that may be severely out of date. The Binance P2P rate may reflect the true parallel market rate.

**Impact on business:** If the data is real, Sudan is a genuine opportunity. If the official rate is stale, the premium calculation is artificially inflated. Strategy team could misread Sudan as higher-priority than it is.

**Recommendation:** Add a note in the UI when a premium exceeds a threshold (e.g., > 100%) flagging it for manual verification. Cross-check the official rate against a secondary source (e.g., xe.com for SDG).

---

### 🟡 MEDIUM — 4 Significant Corridors Excluded Due to No Binance P2P Coverage

**Countries:** Nigeria (NGN), Thailand (THB), South Sudan (SSP), West Bank & Gaza (ILS)

**Combined flow (All):**
- Nigeria: $239M
- Thailand: $119M
- South Sudan: $73M
- West Bank & Gaza: $74M

**Total unscored:** ~$505M across both markets — a meaningful blind spot.

**Current handling:** ✅ Correctly shown with "No P2P data" label and "—" rank in the leaderboard. Correctly excluded from composite score ranking.

**Recommendation:** For Thailand specifically — it's a major corridor ($119M combined) and THB is a major currency. It's unusual that Binance P2P doesn't have THB coverage. Worth verifying whether Binance has really withdrawn P2P from Thailand or if there's a currency code mismatch. Thailand's Binance P2P may exist under a different endpoint or market structure.

---

### 🟡 MEDIUM — Negative-Premium Corridors Included in Ranking

**Countries:** Afghanistan (−4.5%), Indonesia (−0.3%), Lebanon (−1.0%)

**Symptom:** These corridors appear in the composite leaderboard at positions 22, 23, 24 with scores of 10, 5, and 1. A negative premium means the ARP rail would actually **lose** margin on these corridors.

**Spec says:** Only exclude corridors with *no P2P data*. Does not say to exclude negative premiums.

**Impact:** Strategy team sees these as "low score" corridors but they are not merely low-opportunity — they are actively loss-making at current rates. There's no visual distinction between a score of 5 (barely profitable) and a score of 5 (actually negative margin).

**Recommendation:** Add a visual indicator (e.g., red text, "−" prefix, or a warning icon) when `premium < 0` to distinguish loss-making corridors from zero-margin ones. Alternatively, treat them as excluded from ranking (show them like No P2P entries), since a corridor with negative margin is operationally worse than a missing corridor.

---

### 🟡 MEDIUM — USA Listed as a Remittance Corridor with 10% USDT Premium

**Symptom:** The United States appears at #11 in the All composite leaderboard (score 57) with a USDT Premium of 10.0%. This is because Binance P2P shows `1.1 USD/USDT` for the USD market.

**Issue:** USDT should be approximately 1:1 with USD. A 10% premium in the USD P2P market is anomalous and likely reflects specific P2P dynamics (fees, small-volume trades) rather than a genuine FX opportunity.

**Business relevance:** Remittances to the USA from UAE/Bahrain ($40M combined) are likely bank wire transfers or USD-denominated, not a realistic ARP GPS corridor. Including it distorts the leaderboard.

**Recommendation:** Consider filtering out corridors where the destination currency is USD (or the destination is a dollar-pegged economy), or at least add a note that USD-denominated destinations may not represent realistic USDT-premium opportunities.

---

### 🟠 LOW — Country Name Displayed as "Egypt, Arab Rep."

**Symptom:** The leaderboard and tooltip show `Egypt, Arab Rep.` (the raw KNOMAD dataset name) rather than the more readable `Egypt`.

**Impact:** Minor UX issue — a non-technical strategy lead may find this confusing.

**Recommendation:** Add a display-name normalization map in the frontend or backend (e.g., `"Egypt, Arab Rep." → "Egypt"`, `"West Bank and Gaza" → "Palestine"`, `"Korea, Rep." → "South Korea"` if it appears).

---

### 🟠 LOW — Leaderboard Not Visually Scrollable on Small Viewports

**Symptom:** At 860×900 viewport, the leaderboard shows ~15 rows but is clipped. The `overflow-y` property on the leaderboard container was not clearly set to `scroll` in DOM inspection, though the sidebar appears to scroll in the full-page screenshot.

**Recommendation:** Verify that the leaderboard is scrollable on typical laptop screen sizes (1280×800, 1366×768) and that a visual scroll indicator is present.

---

### 🟠 LOW — favicon.ico 404 in Console

**Symptom:** Browser console logs `Failed to load resource: 404 Not Found @ /favicon.ico`.

**Impact:** Cosmetic only — no functional impact.

**Recommendation:** Add a favicon to `frontend/public/` or add `<link rel="icon" href="data:,">` to suppress the 404.

---

### 🟢 INFO — Composite Score Recomputed Correctly Per Market

**Verified:** Switching UAE ↔ Bahrain ↔ All produces different rankings where expected. Example: In UAE view, Bangladesh (#4, 87) outranks Egypt (#5, 83) due to higher UAE→Bangladesh flow. In Bahrain view, Egypt (#4, 87) outranks Bangladesh (#5, 83) due to higher Bahrain→Egypt flow.

---

### 🟢 INFO — Official Rate Source: open.er-api.com (not OANDA/Frankfurter)

**Spec says:** Use OANDA or equivalent free source (Frankfurter, exchangerate-API).

**Implementation:** Uses `open.er-api.com` — documented in README as a deliberate trade-off (Frankfurter only covers ~30 major currencies; open.er-api.com covers ~170 including NGN, SDG, AFN, etc.).

**Assessment:** Acceptable trade-off — using Frankfurter would have silently excluded most corridor currencies. The README documents this clearly.

---

## Verification Checklist

| Requirement | Result |
|---|---|
| Backend starts and logs ~28 corridors per sender | ✅ 28 each (24 scored + 4 No P2P) |
| `GET /api/corridors` returns `{UAE, Bahrain, All}` keys | ✅ |
| All scores differ across markets where flows differ | ✅ Egypt/Bangladesh swap confirmed |
| Top scorer has score=100, bottom has score=1 | ✅ India=100, Lebanon=1 |
| No P2P shown at bottom of leaderboard | ✅ Nigeria, South Sudan, Thailand, West Bank |
| Map highlights destination countries | ✅ |
| Markets toggle switches corridors | ✅ |
| Metric toggle changes color scale and leaderboard sort | ✅ Orange→Blue→Green |
| Hover tooltip shows country + metric value | ✅ |
| Remittance uses B/M suffix | ✅ ($21.7B, $768M, etc.) |
| Premium shows X.X% (one decimal) | ✅ 727.1%, 20.0%, 18.8%, etc. |
| No console errors (functional) | ✅ (only favicon 404) |
| No numbers rendered on SVG map | ✅ |
| Math: mc = flowUSD × premium | ✅ All corridors verified |
| Math: score = percentile[1,100] of rawMargin | ✅ Formula: round((n-rank)/(n-1)×99)+1 |
| Math: All flows = UAE + Bahrain | ✅ |
| Math: premium = (binance/official) − 1 | ✅ |
