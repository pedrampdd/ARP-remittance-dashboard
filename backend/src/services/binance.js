const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/public/c2c/adv/quoted-price';

// Build proxy flag if environment sets one
const proxyEnv = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy;
const curlProxy = proxyEnv ? ['--proxy', proxyEnv] : [];

async function fetchOnePrice(code) {
  const body = JSON.stringify({
    assets: ['USDT'],
    fiatCurrency: code,
    tradeType: 'SELL',
    fromUserRole: 'USER',
  });

  const args = [
    '--silent',
    '--max-time', '20',
    '--request', 'POST',
    '--url', BINANCE_P2P_URL,
    '--header', 'Content-Type: application/json',
    '--header', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '--data', body,
    ...curlProxy,
  ];

  try {
    const { stdout } = await execFileAsync('curl', args, { timeout: 25000 });
    const parsed = JSON.parse(stdout);
    const data = parsed?.data;
    if (Array.isArray(data) && data.length > 0 && data[0].referencePrice != null) {
      return parseFloat(data[0].referencePrice);
    }
    return null;
  } catch (err) {
    console.warn(`  [Binance] ${code}: ${err.message?.split('\n')[0]}`);
    return null;
  }
}

async function fetchBinancePrices(currencyCodes) {
  const results = await Promise.allSettled(
    currencyCodes.map(code => fetchOnePrice(code))
  );

  const priceMap = {};
  currencyCodes.forEach((code, i) => {
    const r = results[i];
    priceMap[code] = r.status === 'fulfilled' ? r.value : null;
  });

  return priceMap;
}

module.exports = { fetchBinancePrices };
