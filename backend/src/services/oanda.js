const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const OPEN_ER_URL = 'https://open.er-api.com/v6/latest/USD';

const proxyEnv = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy;
const curlProxy = proxyEnv ? ['--proxy', proxyEnv] : [];

/**
 * Fetches official USD exchange rates from open.er-api.com (free, no key, ~170 currencies).
 * Returns { currencyCode -> rate } where rate = units of that currency per 1 USD.
 */
async function fetchOfficialRates(currencyCodes) {
  const rateMap = {};
  currencyCodes.forEach(code => { rateMap[code] = null; });

  try {
    const args = [
      '--silent',
      '--max-time', '20',
      '--url', OPEN_ER_URL,
      '--header', 'User-Agent: curl/7.81.0',
      ...curlProxy,
    ];

    const { stdout } = await execFileAsync('curl', args, { timeout: 25000 });
    const parsed = JSON.parse(stdout);

    if (parsed?.result !== 'success') {
      console.warn('  [ExchangeRate] Non-success result:', parsed?.result);
      return rateMap;
    }

    const rates = parsed.rates || {};
    currencyCodes.forEach(code => {
      if (rates[code] != null) {
        rateMap[code] = parseFloat(rates[code]);
      }
    });

    const missing = currencyCodes.filter(c => rateMap[c] === null);
    if (missing.length > 0) {
      console.warn(`  [ExchangeRate] No rate for: ${missing.join(', ')}`);
    }

  } catch (err) {
    console.warn(`  [ExchangeRate] ${err.message?.split('\n')[0]}`);
  }

  return rateMap;
}

module.exports = { fetchOfficialRates };
