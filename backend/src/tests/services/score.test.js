const {
  calculatePremium,
  enrichCorridors,
  rankAndScore,
  processMarket,
} = require('../../services/score');

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

  test('returns null when officialRate is zero', () => {
    expect(calculatePremium(100, 0)).toBeNull();
  });

  test('returns null when officialRate is negative', () => {
    expect(calculatePremium(100, -10)).toBeNull();
  });

  test('returns null for non-numeric binancePrice', () => {
    expect(calculatePremium('100', 100)).toBeNull();
  });

  test('returns null when premium exceeds sanity bound of 5', () => {
    expect(calculatePremium(700, 100)).toBeNull();
  });

  test('returns value at sanity bound boundary (premium = 5)', () => {
    expect(calculatePremium(600, 100)).toBeCloseTo(5, 10);
  });
});

describe('enrichCorridors', () => {
  const binancePrices = { INR: 83.5, PKR: 280.0 };
  const officialRates = { INR: 83.0, PKR: 278.0 };

  test('enriches a known corridor with all prices available', () => {
    const corridors = [{ sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 }];
    const result = enrichCorridors(corridors, binancePrices, officialRates, CURRENCY_MAP, ISO3_MAP);

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
    const [c] = enrichCorridors(corridors, binancePrices, officialRates, CURRENCY_MAP, ISO3_MAP);
    expect(c.sender).toBe('UAE');
    expect(c.destinationName).toBe('India');
    expect(c.flowUSD).toBe(5_000_000);
  });

  test('sets No P2P data when binancePrice is null', () => {
    const [c] = enrichCorridors(
      [{ sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 }],
      { INR: null }, { INR: 83.0 }, CURRENCY_MAP, ISO3_MAP
    );
    expect(c.p2pStatus).toBe('No P2P data');
    expect(c.premium).toBeNull();
    expect(c.rawMargin).toBeNull();
  });

  test('sets No P2P data when officialRate is null', () => {
    const [c] = enrichCorridors(
      [{ sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 }],
      { INR: 83.5 }, { INR: null }, CURRENCY_MAP, ISO3_MAP
    );
    expect(c.p2pStatus).toBe('No P2P data');
    expect(c.premium).toBeNull();
  });

  test('p2pStatus is OK when prices exist even if premium is null (sanity bound exceeded)', () => {
    const [c] = enrichCorridors(
      [{ sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 }],
      { INR: 700 }, { INR: 100 }, CURRENCY_MAP, ISO3_MAP
    );
    expect(c.p2pStatus).toBe('OK');
    expect(c.premium).toBeNull();
    expect(c.rawMargin).toBeNull();
  });

  test('sets No currency mapping for unknown country', () => {
    const [c] = enrichCorridors(
      [{ sender: 'UAE', destinationName: 'Unknown Country', flowUSD: 1_000_000 }],
      binancePrices, officialRates, CURRENCY_MAP, ISO3_MAP
    );
    expect(c.p2pStatus).toBe('No currency mapping');
    expect(c.premium).toBeNull();
  });

  test('handles multiple corridors', () => {
    const corridors = [
      { sender: 'UAE', destinationName: 'India', flowUSD: 1_000_000 },
      { sender: 'Bahrain', destinationName: 'Pakistan', flowUSD: 500_000 },
    ];
    const result = enrichCorridors(corridors, binancePrices, officialRates, CURRENCY_MAP, ISO3_MAP);
    expect(result).toHaveLength(2);
    expect(result.every(c => c.p2pStatus === 'OK')).toBe(true);
  });
});

describe('rankAndScore', () => {
  test('returns empty array for empty input', () => {
    expect(rankAndScore([])).toEqual([]);
  });

  test('n=1: single valid corridor gets score 100', () => {
    const [c] = rankAndScore([{ rawMargin: 500 }]);
    expect(c.score).toBe(100);
  });

  test('n=1: single null-margin corridor gets score null', () => {
    const [c] = rankAndScore([{ rawMargin: null }]);
    expect(c.score).toBeNull();
  });

  test('n=2: top gets 100, bottom gets 1', () => {
    const result = rankAndScore([{ rawMargin: 300 }, { rawMargin: 100 }]);
    const byMargin = m => result.find(c => c.rawMargin === m);
    expect(byMargin(300).score).toBe(100);
    expect(byMargin(100).score).toBe(1);
  });

  test('n=3: middle gets correct percentile score', () => {
    const result = rankAndScore([{ rawMargin: 300 }, { rawMargin: 200 }, { rawMargin: 100 }]);
    const byMargin = m => result.find(c => c.rawMargin === m);
    expect(byMargin(300).score).toBe(100);
    expect(byMargin(200).score).toBe(51);
    expect(byMargin(100).score).toBe(1);
  });

  test('null-margin corridors get null score; valid ones still ranked', () => {
    const result = rankAndScore([{ rawMargin: 300 }, { rawMargin: null }]);
    const byMargin = m => result.find(c => c.rawMargin === m);
    expect(byMargin(300).score).toBe(100);
    expect(byMargin(null).score).toBeNull();
  });

  test('all scores are within [1, 100]', () => {
    const result = rankAndScore([{ rawMargin: 500 }, { rawMargin: 1 }]);
    result.filter(c => c.score !== null).forEach(c => {
      expect(c.score).toBeGreaterThanOrEqual(1);
      expect(c.score).toBeLessThanOrEqual(100);
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

  test('filters to UAE corridors only', () => {
    const result = processMarket(rawCorridors, 'United Arab Emirates', CURRENCY_MAP, ISO3_MAP, binancePrices, officialRates);
    expect(result).toHaveLength(2);
    expect(result.every(c => c.sender === 'United Arab Emirates')).toBe(true);
  });

  test('filters to Bahrain corridors only', () => {
    const result = processMarket(rawCorridors, 'Bahrain', CURRENCY_MAP, ISO3_MAP, binancePrices, officialRates);
    expect(result).toHaveLength(2);
    expect(result.every(c => c.sender === 'Bahrain')).toBe(true);
  });

  test('null filterSender aggregates flowUSD by destination across all senders', () => {
    const result = processMarket(rawCorridors, null, CURRENCY_MAP, ISO3_MAP, binancePrices, officialRates);
    expect(result).toHaveLength(2);
    expect(result.every(c => c.sender === 'All')).toBe(true);
    const india = result.find(c => c.destinationName === 'India');
    expect(india.flowUSD).toBe(2_500_000);
  });

  test('output is sorted with scored corridors first, nulls last', () => {
    const mixed = [
      { sender: 'United Arab Emirates', destinationName: 'India', flowUSD: 2_000_000 },
      { sender: 'United Arab Emirates', destinationName: 'Unknown Country', flowUSD: 500_000 },
    ];
    const result = processMarket(mixed, 'United Arab Emirates', CURRENCY_MAP, ISO3_MAP, binancePrices, officialRates);
    const firstNullIdx = result.findIndex(c => c.score === null);
    const lastScoredIdx = result.reduce((acc, c, i) => c.score !== null ? i : acc, -1);
    if (firstNullIdx !== -1 && lastScoredIdx !== -1) {
      expect(lastScoredIdx).toBeLessThan(firstNullIdx);
    }
  });
});
