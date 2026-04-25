import { describe, it, expect } from 'vitest';
import {
  normalizeCountryName,
  formatScore,
  formatPremium,
  formatFlow,
  getMetricValue,
  formatMetricValue,
} from '../../utils/format.js';

describe('normalizeCountryName', () => {
  it('maps Egypt KNOMAD name to Egypt', () => {
    expect(normalizeCountryName('Egypt, Arab Rep.')).toBe('Egypt');
  });

  it('maps West Bank and Gaza to Palestine', () => {
    expect(normalizeCountryName('West Bank and Gaza')).toBe('Palestine');
  });

  it('maps Korea Rep. to South Korea', () => {
    expect(normalizeCountryName('Korea, Rep.')).toBe('South Korea');
  });

  it('maps Yemen Rep. to Yemen', () => {
    expect(normalizeCountryName('Yemen, Rep.')).toBe('Yemen');
  });

  it('returns the name unchanged when no override exists', () => {
    expect(normalizeCountryName('India')).toBe('India');
  });
});

describe('formatScore', () => {
  it('formats an integer score', () => {
    expect(formatScore(100)).toBe('100');
  });

  it('rounds decimal score up', () => {
    expect(formatScore(75.6)).toBe('76');
  });

  it('rounds decimal score down', () => {
    expect(formatScore(75.4)).toBe('75');
  });

  it('returns em dash for null', () => {
    expect(formatScore(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatScore(undefined)).toBe('—');
  });
});

describe('formatPremium', () => {
  it('formats a positive premium', () => {
    expect(formatPremium(0.143)).toBe('14.3%');
  });

  it('formats zero premium', () => {
    expect(formatPremium(0)).toBe('0.0%');
  });

  it('formats a negative premium', () => {
    expect(formatPremium(-0.05)).toBe('-5.0%');
  });

  it('formats a premium over 100%', () => {
    expect(formatPremium(1.5)).toBe('150.0%');
  });

  it('returns em dash for null', () => {
    expect(formatPremium(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatPremium(undefined)).toBe('—');
  });
});

describe('formatFlow', () => {
  it('formats billions', () => {
    expect(formatFlow(1_800_000_000)).toBe('$1.8B');
  });

  it('formats exactly 1 billion', () => {
    expect(formatFlow(1_000_000_000)).toBe('$1.0B');
  });

  it('formats millions', () => {
    expect(formatFlow(433_000_000)).toBe('$433M');
  });

  it('formats exactly 1 million', () => {
    expect(formatFlow(1_000_000)).toBe('$1M');
  });

  it('formats thousands', () => {
    expect(formatFlow(12_000)).toBe('$12K');
  });

  it('formats exactly 1 thousand', () => {
    expect(formatFlow(1_000)).toBe('$1K');
  });

  it('formats sub-thousand as integer', () => {
    expect(formatFlow(100)).toBe('$100');
  });

  it('returns em dash for null', () => {
    expect(formatFlow(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatFlow(undefined)).toBe('—');
  });
});

describe('getMetricValue', () => {
  it('returns score for composite metric', () => {
    expect(getMetricValue({ score: 85 }, 'composite')).toBe(85);
  });

  it('returns premium for premium metric', () => {
    expect(getMetricValue({ premium: 0.12 }, 'premium')).toBe(0.12);
  });

  it('returns flowUSD for remittance metric', () => {
    expect(getMetricValue({ flowUSD: 5e8 }, 'remittance')).toBe(5e8);
  });

  it('returns null score when score is null', () => {
    expect(getMetricValue({ score: null }, 'composite')).toBeNull();
  });

  it('returns null for an unknown metric', () => {
    expect(getMetricValue({ score: 85 }, 'unknown')).toBeNull();
  });
});

describe('formatMetricValue', () => {
  it('delegates to formatScore for composite', () => {
    expect(formatMetricValue(85, 'composite', {})).toBe('85');
  });

  it('delegates to formatPremium for premium', () => {
    expect(formatMetricValue(0.12, 'premium', {})).toBe('12.0%');
  });

  it('delegates to formatFlow for remittance', () => {
    expect(formatMetricValue(5e8, 'remittance', {})).toBe('$500M');
  });

  it('returns em dash for an unknown metric', () => {
    expect(formatMetricValue(85, 'unknown', {})).toBe('—');
  });
});
