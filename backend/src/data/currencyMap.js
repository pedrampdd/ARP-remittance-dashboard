/**
 * Maps KNOMAD "Partner" country names to ISO-4217 currency codes.
 * Keys match the exact strings from the KNOMAD Excel sheet.
 *
 * Coverage notes:
 *  - Sudan (SDG), Yemen (YER), Afghanistan (AFN), Somalia (SOS), Myanmar (MMK):
 *    may return null from Binance P2P – will show "No P2P data"
 *  - France, United Kingdom, Netherlands, United States, Qatar, Kuwait,
 *    Saudi Arabia: conventional western / GCC currencies fully supported
 *  - West Bank and Gaza uses ILS (Israeli new shekel), the de-facto currency
 *  - South Sudan (SSP): very thin Binance coverage – likely "No P2P data"
 */
const currencyMap = {
  // Top South-East Asia
  'India':                  'INR',
  'Pakistan':               'PKR',
  'Bangladesh':             'BDT',
  'Philippines':            'PHP',
  'Indonesia':              'IDR',
  'Sri Lanka':              'LKR',
  'Nepal':                  'NPR',
  'Thailand':               'THB',

  // Middle East / North Africa
  'Egypt, Arab Rep.':       'EGP',
  'Jordan':                 'JOD',
  'Morocco':                'MAD',
  'Tunisia':                'TND',
  'Lebanon':                'LBP',
  'Turkey':                 'TRY',
  'West Bank and Gaza':     'ILS',

  // Sub-Saharan Africa
  'Nigeria':                'NGN',
  'Ethiopia':               'ETB',
  'Sudan':                  'SDG',
  'Kenya':                  'KES',
  'Somalia':                'SOS',
  'South Sudan':            'SSP',

  // GCC / Gulf
  'Qatar':                  'QAR',
  'Kuwait':                 'KWD',
  'Saudi Arabia':           'SAR',

  // Western
  'France':                 'EUR',
  'United Kingdom':         'GBP',
  'Netherlands':            'EUR',
  'United States':          'USD',

  // Central / South Asia
  'Afghanistan':            'AFN',
};

/**
 * Maps KNOMAD "Partner" country names to ISO 3166-1 alpha-3 codes.
 * Used by react-simple-maps to colour geography features.
 */
const countryToIso3 = {
  'India':                  'IND',
  'Pakistan':               'PAK',
  'Bangladesh':             'BGD',
  'Philippines':            'PHL',
  'Indonesia':              'IDN',
  'Sri Lanka':              'LKA',
  'Nepal':                  'NPL',
  'Thailand':               'THA',

  'Egypt, Arab Rep.':       'EGY',
  'Jordan':                 'JOR',
  'Morocco':                'MAR',
  'Tunisia':                'TUN',
  'Lebanon':                'LBN',
  'Turkey':                 'TUR',
  'West Bank and Gaza':     'PSE',

  'Nigeria':                'NGA',
  'Ethiopia':               'ETH',
  'Sudan':                  'SDN',
  'Kenya':                  'KEN',
  'Somalia':                'SOM',
  'South Sudan':            'SSD',

  'Qatar':                  'QAT',
  'Kuwait':                 'KWT',
  'Saudi Arabia':           'SAU',

  'France':                 'FRA',
  'United Kingdom':         'GBR',
  'Netherlands':            'NLD',
  'United States':          'USA',

  'Afghanistan':            'AFG',
};

module.exports = { currencyMap, countryToIso3 };
