const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const corridorsRouter = require('./routes/corridors');
const { parseKnomadData } = require('./services/knomad');
const { fetchBinancePrices } = require('./services/binance');
const { fetchOfficialRates } = require('./services/oanda');
const { processMarket } = require('./services/score');
const { currencyMap, countryToIso3 } = require('./data/currencyMap');

const PORT = process.env.PORT || 3001;

async function fetchAllData() {
  console.log('[1/4] Parsing KNOMAD Excel data...');
  const rawCorridors = await parseKnomadData();
  console.log(`  → Found ${rawCorridors.length} corridors`);

  // Log corridor breakdown by sender
  const uaeCount = rawCorridors.filter(c => c.sender === 'United Arab Emirates').length;
  const bahrainCount = rawCorridors.filter(c => c.sender === 'Bahrain').length;
  console.log(`  → UAE: ${uaeCount} corridors, Bahrain: ${bahrainCount} corridors`);

  // Get unique destination countries and their currency codes
  const uniqueDestinations = [...new Set(rawCorridors.map(c => c.destinationName))];
  const currencyCodes = [...new Set(
    uniqueDestinations
      .map(name => currencyMap[name])
      .filter(code => code !== undefined)
  )];

  console.log(`[2/4] Fetching Binance P2P prices for ${currencyCodes.length} currencies...`);
  console.log(`[3/4] Fetching official USD rates from Frankfurter...`);

  // Fetch both in parallel
  const [binancePrices, officialRates] = await Promise.all([
    fetchBinancePrices(currencyCodes),
    fetchOfficialRates(currencyCodes),
  ]);

  const binanceFetched = Object.values(binancePrices).filter(p => p !== null).length;
  const officialFetched = Object.values(officialRates).filter(r => r !== null).length;
  console.log(`  → Binance: ${binanceFetched}/${currencyCodes.length} prices fetched`);
  console.log(`  → Frankfurter: ${officialFetched}/${currencyCodes.length} rates fetched`);

  console.log('[4/4] Computing composite scores...');

  const UAE = processMarket(
    rawCorridors,
    'United Arab Emirates',
    currencyMap,
    countryToIso3,
    binancePrices,
    officialRates
  );

  const Bahrain = processMarket(
    rawCorridors,
    'Bahrain',
    currencyMap,
    countryToIso3,
    binancePrices,
    officialRates
  );

  const All = processMarket(
    rawCorridors,
    null, // null = aggregate all senders
    currencyMap,
    countryToIso3,
    binancePrices,
    officialRates
  );

  console.log(`  → UAE: ${UAE.length} corridors scored`);
  console.log(`  → Bahrain: ${Bahrain.length} corridors scored`);
  console.log(`  → All: ${All.length} corridors scored`);

  return { UAE, Bahrain, All };
}

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Mount routes
  app.use('/api/corridors', corridorsRouter);

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  try {
    const data = await fetchAllData();
    corridorsRouter.setCachedData(data);
    console.log('\n✓ Data loaded successfully');
  } catch (error) {
    console.error('Failed to load initial data:', error.message);
    console.error('Server will start but /api/corridors will return 503 until data is available');
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 ARP GPS Dashboard backend running on http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/corridors`);
  });
}

startServer().catch(console.error);
