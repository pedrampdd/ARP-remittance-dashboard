import React, { useState, useMemo } from 'react';
import { useCorridors } from './hooks/useCorridors.js';
import WorldMap from './components/WorldMap.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import MarketsToggle from './components/MarketsToggle.jsx';
import MetricToggle from './components/MetricToggle.jsx';

export default function App() {
  const [market, setMarket] = useState('All');
  const [metric, setMetric] = useState('composite');

  const { data, loading, error } = useCorridors();

  const activeCorridors = useMemo(() => {
    if (!data) return [];
    return data[market] || [];
  }, [data, market]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <h1 className="header-title">ARP Digital</h1>
            <span className="header-subtitle">GPS Dashboard – Corridor Opportunity Ranking</span>
          </div>

          <div className="header-controls">
            <MarketsToggle value={market} onChange={setMarket} />
            <MetricToggle value={metric} onChange={setMetric} />
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading corridor data…</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <h2>Failed to load data</h2>
            <p>{error}</p>
            <p className="error-hint">Make sure the backend is running on port 3001.</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="dashboard-layout">
            <section className="map-section">
              <div className="section-header">
                <h2>Global Remittance Opportunity Map</h2>
                <p className="section-description">
                  {market === 'All' ? 'Both UAE & Bahrain' : market} corridors colored by{' '}
                  {metric === 'composite' ? 'composite opportunity score' :
                   metric === 'premium' ? 'USDT premium over official rate' :
                   'remittance flow volume'}
                </p>
              </div>
              <WorldMap corridors={activeCorridors} metric={metric} />
            </section>

            <aside className="leaderboard-section">
              <div className="section-header">
                <h2>Corridor Rankings</h2>
                <p className="section-description">
                  {activeCorridors.filter(c => c.p2pStatus === 'OK').length} corridors scored
                </p>
              </div>
              <Leaderboard corridors={activeCorridors} metric={metric} />
            </aside>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Data: World Bank KNOMAD 2021 remittance flows ·
          Prices: Binance P2P USDT SELL ·
          Official rates: Open Exchange Rates (open.er-api.com)
        </p>
      </footer>
    </div>
  );
}
