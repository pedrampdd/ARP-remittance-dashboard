const {
  calculatePremium,
  enrichCorridors,
  rankAndScore,
  processMarket,
} = require('../services/score');

const CURRENCY_MAP = { 'India': 'INR', 'Pakistan': 'PKR' };
const ISO3_MAP = { 'India': 'IND', 'Pakistan': 'PAK' };

describe('calculatePremium', () => {
  test('calculates positive premium', () => {
    expect(calculatePremium(110, 100)).toBeCloseTo(0.1, 10);
  });

  test('returns 0 at parity', () => {
    expect(calculatePremium(100, 100)).toBe(0);
  });

  test('calculates negative premium', () => {
    expect(calculatePremium(90, 100)).toBeCloseTo(-0.1, 10);
  });

  test('returns null when binancePrice is null', () => {
    expect(calculatePremium(null, 100)).toBeNull();
  });

  test('returns null when officialRate is null', () => {
    expect(calculatePremium(100, null)).toBeNull();
  });

  test('returns null when binancePrice is undefined', () => {
    expect(calculatePremium(undefined, 100)).toBeNull();
  });

  test('returns null when officialRate is undefined', () => {
    expect(calculatePremium(100, undefined)).toBeNull();
  });

  test('real-world values', () => {
    expect(calculatePremium(3.76, 3.52)).toBeCloseTo((3.76 / 3.52) - 1, 10);
  });
});

describe('enrichCorridors', () => {
  const binancePrices = { INR: 83.5, PKR: 280.0 };
  const officialRates = { INR: 83.0, PKR: 278.0 };

  test('enriches a known corridor with all prices available', () => {
    const corridors = [{ sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 }];
    const result = enrichCorridors(corridors, binancePrices, officialRates, CURRENCY_MAP, ISO3_MAP);

    expect(result).toHaveLength(1);
    const c = result[0];
    expect(c.currencyCode).toBe('INR');
    expect(c.iso3).toBe('IND');
    expect(c.p2pStatus).toBe('OK');
    expect(c.premium).toBeCloseTo((83.5 / 83.0) - 1, 10);
    expect(c.rawMargin).toBeCloseTo(1_000_000 * ((83.5 / 83.0) - 1), 6);
    expect(c.score).toBeNull();
  });

  test('preserves original corridor fields', () => {
    const corridors = [{ sender: 'UAE', destinationName: 'India', flowUSD: 5_000_000 }];
    const result = enrichCorridors(corridors, binancePrices, officialRates, CURRENCY_MAP, ISO3_MAP);
    expect(result[0].sender).toBe('UAE');
    expect(result[0].destinationName).toBe('India');
    expect(result[0].flowUSD).toBe(5_000_000);
  });

  test('sets No P2P data when binancePrice is null', () => {
    const prices = { INR: null };
    const rates = { INR: 83.0 };
    const corridors = [{ sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 }];
    const result = enrichCorridors(corridors, prices, rates, CURRENCY_MAP, ISO3_MAP);

    expect(result[0].p2pStatus).toBe('No P2P data');
    expect(result[0].premium).toBeNull();
    expect(result[0].rawMargin).toBeNull();
  });

  test('sets No P2P data when officialRate is null', () => {
    const prices = { INR: 83.5 };
    const rates = { INR: null };
    const corridors = [{ sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 }];
    const result = enrichCorridors(corridors, prices, rates, CURRENCY_MAP, ISO3_MAP);

    expect(result[0].p2pStatus).toBe('No P2P data');
    expect(result[0].premium).toBeNull();
  });

  test('sets No currency mapping for unknown country', () => {
    const corridors = [{ sender: 'UAE', destinationName: 'Unknown Country', flowUSD: 1_000_000 }];
    const result = enrichCorridors(corridors, binancePrices, officialRates, CURRENCY_MAP, ISO3_MAP);

    expect(result[0].p2pStatus).toBe('No currency mapping');
    expect(result[0].premium).toBeNull();
    expect(result[0].rawMargin).toBeNull();
  });

  test('handles multiple corridors', () => {
    const corridors = [
      { sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 },
      { sender: 'Bahrain', destinationName: 'Pakistan', flowUSD: 500_000 },
    ];
    const result = enrichCorridors(corridors, binancePrices, officialRates, CURRENCY_MAP, ISO3_MAP);
    expect(result).toHaveLength(2);
    expect(result[0].p2pStatus).toBe('OK');
    expect(result[1].p2pStatus).toBe('OK');
  });
});

describe('rankAndScore', () => {
  test('returns empty array for empty input', () => {
    expect(rankAndScore([])).toEqual([]);
  });

  test('n=1: single valid corridor gets score 100', () => {
    const a = { rawMargin: 500 };
    const result = rankAndScore([a]);
    expect(result[0].score).toBe(100);
  });

  test('n=1: single null-margin corridor gets score null', () => {
    const a = { rawMargin: null };
    const result = rankAndScore([a]);
    expect(result[0].score).toBeNull();
  });

  test('n=2: top gets 100, bottom gets 1', () => {
    const a = { rawMargin: 300 };
    const b = { rawMargin: 100 };
    const result = rankAndScore([a, b]);
    const scored = (m) => result.find(c => c.rawMargin === m);
    expect(scored(300).score).toBe(100);
    expect(scored(100).score).toBe(1);
  });

  test('n=3: middle gets correct percentile', () => {
    const a = { rawMargin: 300 };
    const b = { rawMargin: 200 };
    const c = { rawMargin: 100 };
    const result = rankAndScore([a, b, c]);
    const scored = (m) => result.find(x => x.rawMargin === m);
    expect(scored(300).score).toBe(100);
    expect(scored(200).score).toBe(51); // Math.round(((3-2)/(3-1))*99)+1 = 51
    expect(scored(100).score).toBe(1);
  });

  test('null-margin corridors stay null, valid ones still ranked', () => {
    const a = { rawMargin: 300 };
    const b = { rawMargin: null };
    const result = rankAndScore([a, b]);
    const scored = (m) => result.find(x => x.rawMargin === m);
    expect(scored(300).score).toBe(100);
    expect(scored(null).score).toBeNull();
  });

  test('scores are clamped to [1, 100]', () => {
    const a = { rawMargin: 500 };
    const b = { rawMargin: 1 };
    const result = rankAndScore([a, b]);
    result.forEach(c => {
      if (c.score !== null) {
        expect(c.score).toBeGreaterThanOrEqual(1);
        expect(c.score).toBeLessThanOrEqual(100);
      }
    });
  });
});

describe('processMarket', () => {
  const rawCorridors = [
    { sender: 'United Arab Emirates', destinationName: 'India', flowUSD: 2_000_000 },
    { sender: 'United Arab Emirates', destinationName: 'Pakistan', flowUSD: 800_000 },
    { sender: 'Bahrain', destinationName: 'India', flowUSD: 500_000 },
    { sender: 'Bahrain', destinationName: 'Pakistan', flowUSD: 200_000 },
  ];
  const binancePrices = { INR: 83.5, PKR: 280.0 };
  const officialRates = { INR: 83.0, PKR: 278.0 };

  test('filters by UAE sender', () => {
    const result = processMarket(rawCorridors, 'United Arab Emirates', CURRENCY_MAP, ISO3_MAP, binancePrices, officialRates);
    expect(result.every(c => c.sender === 'United Arab Emirates')).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('filters by Bahrain sender', () => {
    const result = processMarket(rawCorridors, 'Bahrain', CURRENCY_MAP, ISO3_MAP, binancePrices, officialRates);
    expect(result.every(c => c.sender === 'Bahrain')).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('null filterSender aggregates by destination and sets sender=All', () => {
    const result = processMarket(rawCorridors, null, CURRENCY_MAP, ISO3_MAP, binancePrices, officialRates);
    expect(result.every(c => c.sender === 'All')).toBe(true);
    expect(result).toHaveLength(2); // India + Pakistan aggregated

    const india = result.find(c => c.destinationName === 'India');
    expect(india.flowUSD).toBe(2_500_000); // 2_000_000 + 500_000
  });

  test('output is sorted descending by score, nulls last', () => {
    const mixedCorridors = [
      { sender: 'United Arab Emirates', destinationName: 'India', flowUSD: 2_000_000 },
      { sender: 'United Arab Emirates', destinationName: 'Unknown Country', flowUSD: 500_000 },
    ];
    const result = processMarket(mixedCorridors, 'United Arab Emirates', CURRENCY_MAP, ISO3_MAP, binancePrices, officialRates);
    const scores = result.map(c => c.score);
    const lastNullIdx = scores.lastIndexOf(null);
    const firstNonNull = scores.findIndex(s => s !== null);
    if (lastNullIdx !== -1 && firstNonNull !== -1) {
      expect(firstNonNull).toBeLessThan(lastNullIdx);
    }
  });
});
