import React from 'react';

const METRICS = [
  { key: 'composite', label: 'Composite' },
  { key: 'premium', label: 'USDT Premium' },
  { key: 'remittance', label: 'Remittance' },
];

export default function MetricToggle({ value, onChange }) {
  return (
    <div className="toggle-group">
      <span className="toggle-label">Metric</span>
      <div className="toggle-buttons">
        {METRICS.map(({ key, label }) => (
          <button
            key={key}
            className={`toggle-btn ${value === key ? 'active' : ''}`}
            onClick={() => onChange(key)}
            aria-pressed={value === label}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
