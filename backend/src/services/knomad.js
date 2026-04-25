const XLSX = require('xlsx');
const path = require('path');

const BILATERAL_INDICATOR = 'Bilateral Remittance Estimates using Migrant Stocks, Host Country Incomes, and Origin Country Incomes (US$ million)';

async function parseKnomadData() {
  const filePath = path.join(__dirname, '../data/WB-KNOMAD.xlsx');
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets['Data'];

  if (!worksheet) throw new Error('Sheet "Data" not found in WB-KNOMAD.xlsx');

  const rows = XLSX.utils.sheet_to_json(worksheet);
  const corridors = [];

  for (const row of rows) {
    const economyName = row['Economy Name'];
    const partner = row['Partner'];
    const indicator = row['Indicator'];
    const flow2021 = row['2021'];

    if (!['United Arab Emirates', 'Bahrain'].includes(economyName)) continue;
    if (partner === 'WORLD' || !partner) continue;
    if (indicator !== BILATERAL_INDICATOR) continue;
    if (flow2021 === null || flow2021 === undefined) continue;

    corridors.push({
      sender: economyName,
      destinationName: partner.trim(),
      flowUSD: flow2021 * 1_000_000,
    });
  }

  return corridors;
}

module.exports = { parseKnomadData };
