/**
 * Calculates premium and composite scores for corridors
 */

/**
 * Calculates USDT premium as (binancePrice / officialRate) - 1
 * @param {number} binancePrice
 * @param {number} officialRate
 * @returns {number|null}
 */
function calculatePremium(binancePrice, officialRate) {
  if (
    binancePrice == null ||
    officialRate == null ||
    typeof binancePrice !== 'number' ||
    typeof officialRate !== 'number' ||
    officialRate <= 0
  ) {
    return null;
  }

  const premium = (binancePrice / officialRate) - 1;

  // Optional sanity bound (prevents absurd API glitches)
  if (!isFinite(premium) || Math.abs(premium) > 5) {
    return null;
  }

  return premium;
}

/**
 * Enriches corridors with premium, raw margin, and scoring
 * @param {Array} corridors - Array of corridor objects with flowUSD
 * @param {Object} binancePrices - currencyCode -> price map
 * @param {Object} officialRates - currencyCode -> rate map
 * @param {Object} currencyMap - destinationName -> currencyCode map
 * @param {Object} countryToIso3 - destinationName -> ISO-3 map
 * @returns {Array} Enriched corridors with premium, rawMargin, p2pStatus
 */
function enrichCorridors(corridors, binancePrices, officialRates, currencyMap, countryToIso3) {
  const enriched = corridors.map(corridor => {
    const { destinationName, flowUSD } = corridor;

    const currencyCode = currencyMap[destinationName];
    const iso3 = countryToIso3[destinationName];

    let premium = null;
    let p2pStatus = 'OK';

    if (!currencyCode) {
      p2pStatus = 'No currency mapping';
    } else {
      const binancePrice = binancePrices[currencyCode];
      const officialRate = officialRates[currencyCode];

      if (binancePrice == null || officialRate == null) {
        p2pStatus = 'No P2P data';
      } else {
        premium = calculatePremium(binancePrice, officialRate);
      }
    }

    const rawMargin = premium !== null ? flowUSD * premium : null;

    return {
      ...corridor,
      iso3,
      currencyCode,
      binancePrice: binancePrices[currencyCode] ?? null,
      officialRate: officialRates[currencyCode] ?? null,
      premium,
      rawMargin,
      p2pStatus,
      score: null, // Will be set after ranking
    };
  });

  return enriched;
}

/**
 * Ranks and scores corridors by raw margin
 * Score is a percentile: top = 100, bottom = 1
 */
function rankAndScore(corridors) {
  const valid = corridors.filter(c => c.rawMargin !== null);

  const sorted = [...valid].sort((a, b) => b.rawMargin - a.rawMargin);

  const rankMap = new Map();
  sorted.forEach((c, i) => rankMap.set(c, i + 1));

  const n = valid.length;

  return corridors.map(c => {
    if (c.rawMargin === null) {
      return { ...c, score: null };
    }

    const rank = rankMap.get(c);
    const percentile =
      n === 1 ? 100 : Math.round(((n - rank) / (n - 1)) * 99) + 1;

    return {
      ...c,
      score: Math.max(1, Math.min(100, percentile)),
    };
  });
}
/**
 * Processes corridors for a given market filter (UAE, Bahrain, or All)
 */
function processMarket(corridors, filterSender = null, currencyMap, countryToIso3, binancePrices, officialRates) {
  let filtered = corridors;

  if (filterSender) {
    filtered = corridors.filter(c => c.sender === filterSender);
  } else {
    // For 'All', aggregate by destination
    const aggregated = {};
    corridors.forEach(corridor => {
      const key = corridor.destinationName;
      if (!aggregated[key]) {
        aggregated[key] = {
          sender: 'All',
          destinationName: corridor.destinationName,
          flowUSD: 0,
        };
      }
      aggregated[key].flowUSD += corridor.flowUSD;
    });
    filtered = Object.values(aggregated);
  }

  // Enrich with P2P data
  const enriched = enrichCorridors(filtered, binancePrices, officialRates, currencyMap, countryToIso3);

  // Rank and score
  const scored = rankAndScore(enriched);

  // Sort by score descending for output
  return scored.sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1; // No P2P data goes to bottom
    if (b.score === null) return -1;
    return b.score - a.score;
  });
}

module.exports = {
  calculatePremium,
  enrichCorridors,
  rankAndScore,
  processMarket,
};
