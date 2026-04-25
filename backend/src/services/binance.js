const { jsonRequest } = require('./request');

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/public/c2c/adv/quoted-price';

async function fetchOnePrice(code) {
  try {
    const parsed = await jsonRequest(BINANCE_P2P_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: { assets: ['USDT'], fiatCurrency: code, tradeType: 'SELL', fromUserRole: 'USER' },
      timeout: 20000,
    });
    const price = parsed?.data?.[0]?.referencePrice;
    return price != null ? parseFloat(price) : null;
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
