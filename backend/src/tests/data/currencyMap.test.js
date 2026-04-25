const { currencyMap, countryToIso3 } = require('../../data/currencyMap');

describe('currencyMap', () => {
  test('maps India to INR', () => {
    expect(currencyMap['India']).toBe('INR');
  });

  test('maps Egypt using KNOMAD comma-format key', () => {
    expect(currencyMap['Egypt, Arab Rep.']).toBe('EGP');
  });

  test('maps West Bank and Gaza to ILS', () => {
    expect(currencyMap['West Bank and Gaza']).toBe('ILS');
  });

  test('maps Pakistan to PKR', () => {
    expect(currencyMap['Pakistan']).toBe('PKR');
  });

  test('maps United States to USD', () => {
    expect(currencyMap['United States']).toBe('USD');
  });

  test('returns undefined for unknown country', () => {
    expect(currencyMap['NonExistentCountry']).toBeUndefined();
  });
});

describe('countryToIso3', () => {
  test('maps India to IND', () => {
    expect(countryToIso3['India']).toBe('IND');
  });

  test('maps Egypt using KNOMAD comma-format key', () => {
    expect(countryToIso3['Egypt, Arab Rep.']).toBe('EGY');
  });

  test('maps West Bank and Gaza to PSE', () => {
    expect(countryToIso3['West Bank and Gaza']).toBe('PSE');
  });

  test('maps United States to USA', () => {
    expect(countryToIso3['United States']).toBe('USA');
  });

  test('returns undefined for unknown country', () => {
    expect(countryToIso3['NonExistentCountry']).toBeUndefined();
  });
});

describe('map structural integrity', () => {
  test('currencyMap and countryToIso3 cover the same set of countries', () => {
    expect(Object.keys(currencyMap).sort()).toEqual(Object.keys(countryToIso3).sort());
  });

  test('all currency codes are 3-letter uppercase strings', () => {
    Object.values(currencyMap).forEach(code => {
      expect(code).toMatch(/^[A-Z]{3}$/);
    });
  });

  test('all ISO3 codes are 3-letter uppercase strings', () => {
    Object.values(countryToIso3).forEach(iso3 => {
      expect(iso3).toMatch(/^[A-Z]{3}$/);
    });
  });
});
