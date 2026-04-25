import React from 'react';

const MARKETS = ['All', 'UAE', 'Bahrain'];

export default function MarketsToggle({ value, onChange }) {
  return (
    <div className="toggle-group">
      <span className="toggle-label">Market</span>
      <div className="toggle-buttons">
        {MARKETS.map(market => (
          <button
  key={market}
  className={`toggle-btn ${value === market ? 'active' : ''}`}
  onClick={() => onChange(market)}
  aria-pressed={value === market}
>
            {market}
          </button>
        ))}
      </div>
    </div>
  );
}
