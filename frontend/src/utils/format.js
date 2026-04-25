/**
 * Display name overrides for raw KNOMAD country names
 */
const DISPLAY_NAMES = {
  'Egypt, Arab Rep.': 'Egypt',
  'West Bank and Gaza': 'Palestine',
  'Korea, Rep.': 'South Korea',
  'Yemen, Rep.': 'Yemen',
};

/**
 * Normalize a raw KNOMAD country name to a human-readable display name
 */
export function normalizeCountryName(name) {
  return DISPLAY_NAMES[name] ?? name;
}

/**
 * Format a composite score (integer 1-100)
 */
export function formatScore(score) {
  if (score === null || score === undefined) return '—';
  return String(Math.round(score));
}

/**
 * Format a USDT premium as percentage with one decimal (e.g. "14.3%")
 */
export function formatPremium(premium) {
  if (premium === null || premium === undefined) return '—';
  return (premium * 100).toFixed(1) + '%';
}

/**
 * Format a remittance flow value with B/M/K suffix (e.g. "$1.8B", "$433M", "$12K")
 */
export function formatFlow(flowUSD) {
  if (flowUSD === null || flowUSD === undefined) return '—';
  const abs = Math.abs(flowUSD);
  if (abs >= 1_000_000_000) {
    return '$' + (flowUSD / 1_000_000_000).toFixed(1) + 'B';
  } else if (abs >= 1_000_000) {
    return '$' + (flowUSD / 1_000_000).toFixed(0) + 'M';
  } else if (abs >= 1_000) {
    return '$' + (flowUSD / 1_000).toFixed(0) + 'K';
  }
  return '$' + Math.round(flowUSD);
}

/**
 * Format a metric value based on the metric type
 */
export function formatMetricValue(value, metric, corridor) {
  if (metric === 'composite') return formatScore(value);
  if (metric === 'premium') return formatPremium(value);
  if (metric === 'remittance') return formatFlow(value);
  return '—';
}

/**
 * Get the raw metric value for a corridor based on selected metric
 */
export function getMetricValue(corridor, metric) {
  if (metric === 'composite') return corridor.score;
  if (metric === 'premium') return corridor.premium;
  if (metric === 'remittance') return corridor.flowUSD;
  return null;
}
