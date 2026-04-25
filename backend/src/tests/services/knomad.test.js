const { parseKnomadData } = require('../../services/knomad');

jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: { sheet_to_json: jest.fn() },
}));

const XLSX = require('xlsx');

const BILATERAL_INDICATOR =
  'Bilateral Remittance Estimates using Migrant Stocks, Host Country Incomes, and Origin Country Incomes (US$ million)';

function makeRow(overrides = {}) {
  return {
    'Economy Name': 'United Arab Emirates',
    'Partner': 'India',
    'Indicator': BILATERAL_INDICATOR,
    '2021': 8.5,
    ...overrides,
  };
}

describe('parseKnomadData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    XLSX.readFile.mockReturnValue({ Sheets: { Data: {} } });
  });

  test('returns corridors for UAE and Bahrain senders', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      makeRow({ 'Economy Name': 'United Arab Emirates' }),
      makeRow({ 'Economy Name': 'Bahrain' }),
    ]);
    const result = await parseKnomadData();
    expect(result).toHaveLength(2);
  });

  test('excludes senders that are not UAE or Bahrain', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      makeRow({ 'Economy Name': 'Saudi Arabia' }),
      makeRow({ 'Economy Name': 'Kuwait' }),
    ]);
    expect(await parseKnomadData()).toHaveLength(0);
  });

  test('excludes WORLD as partner', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([makeRow({ 'Partner': 'WORLD' })]);
    expect(await parseKnomadData()).toHaveLength(0);
  });

  test('excludes rows with empty partner', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      makeRow({ 'Partner': '' }),
      makeRow({ 'Partner': undefined }),
    ]);
    expect(await parseKnomadData()).toHaveLength(0);
  });

  test('excludes rows with wrong indicator', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      makeRow({ 'Indicator': 'Some other indicator' }),
    ]);
    expect(await parseKnomadData()).toHaveLength(0);
  });

  test('excludes rows where the 2021 value is null or undefined', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      makeRow({ '2021': null }),
      makeRow({ '2021': undefined }),
    ]);
    expect(await parseKnomadData()).toHaveLength(0);
  });

  test('converts flow from millions to absolute USD', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([makeRow({ '2021': 8.5 })]);
    const [c] = await parseKnomadData();
    expect(c.flowUSD).toBe(8_500_000);
  });

  test('trims whitespace from partner name', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([makeRow({ 'Partner': '  India  ' })]);
    const [c] = await parseKnomadData();
    expect(c.destinationName).toBe('India');
  });

  test('returns the correct corridor object shape', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([makeRow()]);
    const [c] = await parseKnomadData();
    expect(c).toMatchObject({
      sender: 'United Arab Emirates',
      destinationName: 'India',
      flowUSD: 8_500_000,
    });
    expect(Object.keys(c)).toEqual(['sender', 'destinationName', 'flowUSD']);
  });

  test('throws when the Data sheet is missing', async () => {
    XLSX.readFile.mockReturnValue({ Sheets: {} });
    await expect(parseKnomadData()).rejects.toThrow('Sheet "Data" not found');
  });
});
