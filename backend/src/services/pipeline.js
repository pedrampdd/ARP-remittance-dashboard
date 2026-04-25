const { parseKnomadData } = require('./knomad');
const { fetchBinancePrices } = require('./binance');
const { fetchOfficialRates } = require('./oanda');
const { processMarket } = require('./score');
const { currencyMap, countryToIso3 } = require('../data/currencyMap');

async function fetchAllData() {
  console.log('[1/4] Parsing KNOMAD Excel data...');
  const rawCorridors = await parseKnomadData();
  console.log(`  → Found ${rawCorridors.length} corridors`);

  const uaeCount = rawCorridors.filter(c => c.sender === 'United Arab Emirates').length;
  const bahrainCount = rawCorridors.filter(c => c.sender === 'Bahrain').length;
  console.log(`  → UAE: ${uaeCount} corridors, Bahrain: ${bahrainCount} corridors`);

  const uniqueDestinations = [...new Set(rawCorridors.map(c => c.destinationName))];
  const currencyCodes = [...new Set(
    uniqueDestinations
      .map(name => currencyMap[name])
      .filter(code => code !== undefined)
  )];

  console.log(`[2/4] Fetching Binance P2P prices for ${currencyCodes.length} currencies...`);
  console.log(`[3/4] Fetching official USD rates from open.er-api.com...`);

  const [binancePrices, officialRates] = await Promise.all([
    fetchBinancePrices(currencyCodes),
    fetchOfficialRates(currencyCodes),
  ]);

  const binanceFetched = Object.values(binancePrices).filter(p => p !== null).length;
  const officialFetched = Object.values(officialRates).filter(r => r !== null).length;
  console.log(`  → Binance: ${binanceFetched}/${currencyCodes.length} prices fetched`);
  console.log(`  → Rates: ${officialFetched}/${currencyCodes.length} rates fetched`);

  console.log('[4/4] Computing composite scores...');

  const UAE = processMarket(
    rawCorridors, 'United Arab Emirates', currencyMap, countryToIso3, binancePrices, officialRates
  );
  const Bahrain = processMarket(
    rawCorridors, 'Bahrain', currencyMap, countryToIso3, binancePrices, officialRates
  );
  const All = processMarket(
    rawCorridors, null, currencyMap, countryToIso3, binancePrices, officialRates
  );

  console.log(`  → UAE: ${UAE.length} corridors scored`);
  console.log(`  → Bahrain: ${Bahrain.length} corridors scored`);
  console.log(`  → All: ${All.length} corridors scored`);

  return { UAE, Bahrain, All };
}

module.exports = { fetchAllData };
