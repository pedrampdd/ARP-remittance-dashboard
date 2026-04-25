import React, { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import { scaleSequential } from 'd3-scale';
import {
  interpolateOranges,
  interpolateBlues,
  interpolateGreens,
} from 'd3-scale-chromatic';
import { formatScore, formatPremium, formatFlow, getMetricValue, normalizeCountryName } from '../utils/format.js';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Map from world-atlas topology country name → ISO3 to match our corridor data
const GEO_NAME_TO_ISO3 = {
  'India': 'IND',
  'Pakistan': 'PAK',
  'Bangladesh': 'BGD',
  'Philippines': 'PHL',
  'Indonesia': 'IDN',
  'Sri Lanka': 'LKA',
  'Nepal': 'NPL',
  'Thailand': 'THA',
  'Egypt': 'EGY',
  'Jordan': 'JOR',
  'Morocco': 'MAR',
  'Tunisia': 'TUN',
  'Lebanon': 'LBN',
  'Turkey': 'TUR',
  'Palestine': 'PSE',
  'Nigeria': 'NGA',
  'Ethiopia': 'ETH',
  'Sudan': 'SDN',
  'Kenya': 'KEN',
  'Somalia': 'SOM',
  'S. Sudan': 'SSD',
  'Qatar': 'QAT',
  'Kuwait': 'KWT',
  'Saudi Arabia': 'SAU',
  'France': 'FRA',
  'United Kingdom': 'GBR',
  'Netherlands': 'NLD',
  'United States of America': 'USA',
  'Afghanistan': 'AFG',
};

function getColorScale(metric, corridors) {
  if (metric === 'composite') {
    return scaleSequential(interpolateOranges).domain([1, 100]);
  }
  if (metric === 'premium') {
    const vals = corridors.filter(c => c.premium !== null).map(c => c.premium);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    return scaleSequential(interpolateBlues).domain([minVal, maxVal]);
  }
  if (metric === 'remittance') {
    const vals = corridors.filter(c => c.flowUSD !== null).map(c => c.flowUSD);
    const maxVal = vals.length > 0 ? Math.max(...vals) : 1;
    return scaleSequential(interpolateGreens).domain([0, maxVal]);
  }
  return () => '#D6D6DA';
}

function formatTooltipValue(corridor, metric) {
  const val = getMetricValue(corridor, metric);
  if (val === null) return 'No data';
  if (metric === 'composite') return formatScore(val);
  if (metric === 'premium') return formatPremium(val);
  if (metric === 'remittance') return formatFlow(val);
  return '—';
}

export default function WorldMap({ corridors = [], metric = 'composite' }) {
  const [tooltip, setTooltip] = useState(null);

  // Build lookup map: iso3 → corridor
  const corridorByIso3 = useMemo(() => {
    const map = {};
    corridors.forEach(c => {
      if (c.iso3) map[c.iso3] = c;
    });
    return map;
  }, [corridors]);

  const colorScale = useMemo(
    () => getColorScale(metric, corridors),
    [metric, corridors]
  );

  function getCountryColor(iso3) {
    const corridor = corridorByIso3[iso3];
    if (!corridor) return '#2A2D3E';           // Not a destination
    if (corridor.p2pStatus === 'No P2P data available') return '#3D4060';
    if (corridor.p2pStatus === 'No currency mapping') return '#555';
    if (corridor.p2pStatus === 'No FX rate available') return '#666';
    const val = getMetricValue(corridor, metric);
    if (val === null) return '#3D4060';
    return colorScale(val);
  }

  // Compute legend info
  const legendInfo = useMemo(() => {
    if (metric === 'composite') return { low: '1', high: '100', label: 'Composite Score' };
    if (metric === 'premium') {
      const vals = corridors.filter(c => c.premium !== null).map(c => c.premium);
      const maxPremium = vals.length > 0 ? Math.max(...vals) : 0;
      return { low: '0%', high: formatPremium(maxPremium), label: 'USDT Premium' };
    }
    if (metric === 'remittance') {
      const vals = corridors.filter(c => c.flowUSD !== null).map(c => c.flowUSD);
      const maxFlow = vals.length > 0 ? Math.max(...vals) : 0;
      return { low: '$0', high: formatFlow(maxFlow), label: 'Remittance Flow' };
    }
    return { low: '', high: '', label: '' };
  }, [metric, corridors]);

  return (
    <div className="world-map-wrapper">
      {tooltip && (
        <div
          className="map-tooltip"
          style={{ left: Math.min(window.innerWidth - 160, tooltip.x + 14),
            top: Math.max(10, tooltip.y - 10), }}
        >
          <strong>{tooltip.name}</strong>
          <br />
          {tooltip.status !== 'OK'
            ? <span className="tooltip-no-data">{tooltip.status}</span>
            : <span>{legendInfo.label}: <strong>{tooltip.value}</strong></span>
          }
        </div>
      )}

      <ComposableMap
        projectionConfig={{ scale: 147, center: [15, 10] }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const geoName = geo.properties?.name;
              const iso3 = GEO_NAME_TO_ISO3[geoName];
              const corridor = iso3 ? corridorByIso3[iso3] : null;
              const color = getCountryColor(iso3);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={color}
                  stroke="#1a1d27"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: {
                      outline: 'none',
                      fill: corridor ? '#f97316' : '#353850',
                      cursor: corridor ? 'pointer' : 'default',
                    },
                    pressed: { outline: 'none' },
                  }}
                  onMouseMove={(evt) => {
                    if (!corridor) return;
                    setTooltip({
                      x: evt.clientX,
                      y: evt.clientY,
                      name: normalizeCountryName(corridor.destinationName),
                      status: corridor.p2pStatus,
                      value: formatTooltipValue(corridor, metric),
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Color Legend */}
      <div className="map-legend">
        <div className="legend-inner">
          <div className="legend-title">{legendInfo.label}</div>
          <div className="legend-bar-row">
            <span className="legend-low">{legendInfo.low}</span>
            <div
              className="legend-gradient"
              style={{
                background: metric === 'composite'
                  ? 'linear-gradient(to right, #FFF7ED, #EA580C)'
                  : metric === 'premium'
                  ? 'linear-gradient(to right, #EFF6FF, #1D4ED8)'
                  : 'linear-gradient(to right, #F0FDF4, #16A34A)',
              }}
            />
            <span className="legend-high">{legendInfo.high}</span>
          </div>
          <div className="legend-note">
            <span className="legend-swatch" style={{ background: '#3D4060' }} /> No P2P data &nbsp;
            <span className="legend-swatch" style={{ background: '#2A2D3E' }} /> Not a destination
          </div>
        </div>
      </div>
    </div>
  );
}
