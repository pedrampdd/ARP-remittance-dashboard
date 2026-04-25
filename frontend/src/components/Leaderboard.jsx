import React, { useMemo } from 'react';
import { formatScore, formatPremium, formatFlow, getMetricValue, normalizeCountryName } from '../utils/format.js';

function formatMetric(corridor, metric) {
  if (corridor.p2pStatus !== 'OK') return null;
  const val = getMetricValue(corridor, metric);
  if (val === null || val === undefined) return null;
  if (metric === 'composite') return formatScore(val);
  if (metric === 'premium') return formatPremium(val);
  if (metric === 'remittance') return formatFlow(val);
  return '—';
}

export default function Leaderboard({ corridors = [], metric = 'composite' }) {
  const sorted = useMemo(() => {
    const valid = corridors.filter(c => c.p2pStatus === 'OK' && getMetricValue(c, metric) !== null);
    const invalid = corridors.filter(c => c.p2pStatus !== 'OK' || getMetricValue(c, metric) === null);

    valid.sort((a, b) => {
      const av = getMetricValue(a, metric);
      const bv = getMetricValue(b, metric);
      return bv - av;
    });

    return [...valid, ...invalid];
  }, [corridors, metric]);

  const metricLabel = {
    composite: 'Composite Score',
    premium: 'USDT Premium',
    remittance: 'Remittance Flow',
  }[metric];

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <span className="col-rank">#</span>
        <span className="col-country">Country</span>
        <span className="col-metric">{metricLabel}</span>
      </div>

      <div className="leaderboard-body">
        {sorted.map((corridor, idx) => {
          const isValid = corridor.p2pStatus === 'OK' && getMetricValue(corridor, metric) !== null;
          const formattedValue = formatMetric(corridor, metric);
          const isNegativePremium = metric === 'premium' && corridor.premium !== null && corridor.premium < 0;
          const isHighPremium = metric === 'premium' && corridor.premium !== null && corridor.premium > 1.0;
          const isUsdDestination = corridor.currencyCode === 'USD';

          return (
            <div
              key={`${corridor.destinationName}-${idx}`}
              className={`leaderboard-row ${!isValid ? 'no-data' : ''}`}
            >
              <span className="col-rank">{isValid ? idx + 1 : '—'}</span>
              <span className="col-country">
                {normalizeCountryName(corridor.destinationName)}
                {isUsdDestination && (
                  <span className="country-tag" title="USD-denominated destination — premium may reflect P2P dynamics, not a real FX gap">USD</span>
                )}
              </span>
              <span className="col-metric">
                {isValid ? (
                  <span
                    className={`metric-badge metric-${metric}${isNegativePremium ? ' premium-negative' : ''}`}
                    title={
                      isNegativePremium
                        ? 'Negative premium — ARP would lose margin on this corridor at current rates'
                        : isHighPremium
                        ? 'Premium exceeds 100% — verify official rate is not stale (possible data quality issue)'
                        : undefined
                    }
                  >
                    {isHighPremium && <span className="premium-warn" aria-label="High premium warning">⚠ </span>}
                    {formattedValue}
                  </span>
                ) : (
                  <span className="no-data-label">
                    {corridor.p2pStatus === 'No currency mapping'
                      ? 'No mapping'
                      : 'No P2P data'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
