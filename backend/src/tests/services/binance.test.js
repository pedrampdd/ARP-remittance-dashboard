const { fetchBinancePrices } = require('../../services/binance');
const { jsonRequest } = require('../../services/request');

jest.mock('../../services/request');

describe('fetchBinancePrices', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns price map for a successful response', async () => {
    jsonRequest.mockResolvedValue({ data: [{ referencePrice: '83.5' }] });
    const result = await fetchBinancePrices(['INR']);
    expect(result).toEqual({ INR: 83.5 });
  });

  test('parses referencePrice as a float', async () => {
    jsonRequest.mockResolvedValue({ data: [{ referencePrice: '280.75' }] });
    const result = await fetchBinancePrices(['PKR']);
    expect(result.PKR).toBe(280.75);
  });

  test('returns null when referencePrice is absent from response', async () => {
    jsonRequest.mockResolvedValue({ data: [{}] });
    const result = await fetchBinancePrices(['INR']);
    expect(result.INR).toBeNull();
  });

  test('returns null when data array is empty', async () => {
    jsonRequest.mockResolvedValue({ data: [] });
    const result = await fetchBinancePrices(['INR']);
    expect(result.INR).toBeNull();
  });

  test('returns null for a currency when the request throws', async () => {
    jsonRequest.mockRejectedValue(new Error('network error'));
    const result = await fetchBinancePrices(['INR']);
    expect(result.INR).toBeNull();
  });

  test('handles partial failures — successful currencies still populated', async () => {
    jsonRequest
      .mockResolvedValueOnce({ data: [{ referencePrice: '83.5' }] })
      .mockRejectedValueOnce(new Error('timeout'));
    const result = await fetchBinancePrices(['INR', 'PKR']);
    expect(result.INR).toBe(83.5);
    expect(result.PKR).toBeNull();
  });

  test('result map contains every requested currency code', async () => {
    jsonRequest.mockResolvedValue({ data: [{ referencePrice: '100' }] });
    const result = await fetchBinancePrices(['INR', 'PKR', 'EGP']);
    expect(Object.keys(result).sort()).toEqual(['EGP', 'INR', 'PKR']);
  });

  test('returns empty object and makes no requests for empty input', async () => {
    const result = await fetchBinancePrices([]);
    expect(result).toEqual({});
    expect(jsonRequest).not.toHaveBeenCalled();
  });

  test('calls the API once per currency code', async () => {
    jsonRequest.mockResolvedValue({ data: [{ referencePrice: '100' }] });
    await fetchBinancePrices(['INR', 'PKR', 'EGP']);
    expect(jsonRequest).toHaveBeenCalledTimes(3);
  });
});
