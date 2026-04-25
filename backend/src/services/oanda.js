const { jsonRequest } = require('./request');

const OPEN_ER_URL = 'https://open.er-api.com/v6/latest/USD';

async function fetchOfficialRates(currencyCodes) {
  const rateMap = {};
  currencyCodes.forEach(code => { rateMap[code] = null; });

  try {
    const parsed = await jsonRequest(OPEN_ER_URL, {
      headers: { 'User-Agent': 'curl/7.81.0' },
      timeout: 20000,
    });

    if (parsed?.result !== 'success') {
      console.warn('  [ExchangeRate] Non-success result:', parsed?.result);
      return rateMap;
    }

    const rates = parsed.rates || {};
    currencyCodes.forEach(code => {
      if (rates[code] != null) rateMap[code] = parseFloat(rates[code]);
    });

    const missing = currencyCodes.filter(c => rateMap[c] === null);
    if (missing.length > 0) console.warn(`  [ExchangeRate] No rate for: ${missing.join(', ')}`);
  } catch (err) {
    console.warn(`  [ExchangeRate] ${err.message?.split('\n')[0]}`);
  }

  return rateMap;
}

module.exports = { fetchOfficialRates };
