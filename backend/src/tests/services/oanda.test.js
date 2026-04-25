const { fetchOfficialRates } = require('../../services/oanda');
const { jsonRequest } = require('../../services/request');

jest.mock('../../services/request');

describe('fetchOfficialRates', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns rates for all requested currencies', async () => {
    jsonRequest.mockResolvedValue({
      result: 'success',
      rates: { INR: 83.0, PKR: 278.5 },
    });
    const result = await fetchOfficialRates(['INR', 'PKR']);
    expect(result).toEqual({ INR: 83.0, PKR: 278.5 });
  });

  test('parses string rates as floats', async () => {
    jsonRequest.mockResolvedValue({ result: 'success', rates: { INR: '83.12' } });
    const result = await fetchOfficialRates(['INR']);
    expect(result.INR).toBe(83.12);
  });

  test('returns null for currencies absent from the API response', async () => {
    jsonRequest.mockResolvedValue({ result: 'success', rates: { INR: 83.0 } });
    const result = await fetchOfficialRates(['INR', 'XYZ']);
    expect(result.INR).toBe(83.0);
    expect(result.XYZ).toBeNull();
  });

  test('returns all nulls when API result is not success', async () => {
    jsonRequest.mockResolvedValue({ result: 'error' });
    const result = await fetchOfficialRates(['INR', 'PKR']);
    expect(result).toEqual({ INR: null, PKR: null });
  });

  test('returns all nulls when request throws', async () => {
    jsonRequest.mockRejectedValue(new Error('network error'));
    const result = await fetchOfficialRates(['INR', 'PKR']);
    expect(result).toEqual({ INR: null, PKR: null });
  });

  test('returns all nulls when rates property is missing from response', async () => {
    jsonRequest.mockResolvedValue({ result: 'success' });
    const result = await fetchOfficialRates(['INR']);
    expect(result.INR).toBeNull();
  });

  test('result map contains every requested currency code', async () => {
    jsonRequest.mockResolvedValue({
      result: 'success',
      rates: { INR: 83.0, PKR: 278.5, EGP: 30.9 },
    });
    const result = await fetchOfficialRates(['INR', 'PKR', 'EGP']);
    expect(Object.keys(result).sort()).toEqual(['EGP', 'INR', 'PKR']);
  });

  test('returns empty object for empty input', async () => {
    const result = await fetchOfficialRates([]);
    expect(result).toEqual({});
  });

  test('calls the exchange rate API exactly once regardless of currency count', async () => {
    jsonRequest.mockResolvedValue({ result: 'success', rates: {} });
    await fetchOfficialRates(['INR', 'PKR', 'EGP']);
    expect(jsonRequest).toHaveBeenCalledTimes(1);
  });
});
