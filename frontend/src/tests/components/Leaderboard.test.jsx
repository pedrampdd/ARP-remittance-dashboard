import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Leaderboard from '../../components/Leaderboard.jsx';

const corridorOK = {
  destinationName: 'India', p2pStatus: 'OK', score: 85,
  premium: 0.12, flowUSD: 500_000_000, currencyCode: 'INR', iso3: 'IND',
};
const corridorOK2 = {
  destinationName: 'Pakistan', p2pStatus: 'OK', score: 60,
  premium: 0.08, flowUSD: 200_000_000, currencyCode: 'PKR', iso3: 'PAK',
};
const corridorNoData = {
  destinationName: 'Sudan', p2pStatus: 'No P2P data', score: null,
  premium: null, flowUSD: 100_000_000, currencyCode: 'SDG', iso3: 'SDN',
};
const corridorNoMapping = {
  destinationName: 'Unknown Country', p2pStatus: 'No currency mapping', score: null,
  premium: null, flowUSD: 50_000_000, currencyCode: undefined, iso3: undefined,
};
const corridorUSD = {
  destinationName: 'United States', p2pStatus: 'OK', score: 40,
  premium: 0.02, flowUSD: 300_000_000, currencyCode: 'USD', iso3: 'USA',
};
const corridorNegativePremium = {
  destinationName: 'France', p2pStatus: 'OK', score: 30,
  premium: -0.05, flowUSD: 150_000_000, currencyCode: 'EUR', iso3: 'FRA',
};
const corridorHighPremium = {
  destinationName: 'Nigeria', p2pStatus: 'OK', score: 70,
  premium: 1.5, flowUSD: 250_000_000, currencyCode: 'NGN', iso3: 'NGA',
};
const corridorEgypt = {
  destinationName: 'Egypt, Arab Rep.', p2pStatus: 'OK', score: 75,
  premium: 0.1, flowUSD: 400_000_000, currencyCode: 'EGP', iso3: 'EGY',
};

describe('Leaderboard', () => {
  it('renders without crash on empty corridors', () => {
    render(<Leaderboard corridors={[]} metric="composite" />);
    expect(screen.getByText('#')).toBeInTheDocument();
  });

  it('shows Composite Score header for composite metric', () => {
    render(<Leaderboard corridors={[corridorOK]} metric="composite" />);
    expect(screen.getByText('Composite Score')).toBeInTheDocument();
  });

  it('shows USDT Premium header for premium metric', () => {
    render(<Leaderboard corridors={[corridorOK]} metric="premium" />);
    expect(screen.getByText('USDT Premium')).toBeInTheDocument();
  });

  it('shows Remittance Flow header for remittance metric', () => {
    render(<Leaderboard corridors={[corridorOK]} metric="remittance" />);
    expect(screen.getByText('Remittance Flow')).toBeInTheDocument();
  });

  it('shows rank 1 for the first valid corridor', () => {
    render(<Leaderboard corridors={[corridorOK]} metric="composite" />);
    const rows = document.querySelectorAll('.leaderboard-row');
    expect(rows[0].querySelector('.col-rank').textContent).toBe('1');
  });

  it('shows em dash rank for no-data corridors', () => {
    render(<Leaderboard corridors={[corridorNoData]} metric="composite" />);
    const rows = document.querySelectorAll('.leaderboard-row');
    expect(rows[0].querySelector('.col-rank').textContent).toBe('—');
  });

  it('renders valid corridors before no-data corridors', () => {
    render(<Leaderboard corridors={[corridorNoData, corridorOK]} metric="composite" />);
    const rows = document.querySelectorAll('.leaderboard-row');
    expect(rows[0]).toHaveTextContent('India');
    expect(rows[1]).toHaveTextContent('Sudan');
  });

  it('shows No P2P data label', () => {
    render(<Leaderboard corridors={[corridorNoData]} metric="composite" />);
    expect(screen.getByText('No P2P data')).toBeInTheDocument();
  });

  it('shows No mapping label for no-currency-mapping corridors', () => {
    render(<Leaderboard corridors={[corridorNoMapping]} metric="composite" />);
    expect(screen.getByText('No mapping')).toBeInTheDocument();
  });

  it('applies premium-negative class for negative premium', () => {
    render(<Leaderboard corridors={[corridorNegativePremium]} metric="premium" />);
    expect(document.querySelector('.metric-badge')).toHaveClass('premium-negative');
  });

  it('does not apply premium-negative class for positive premium', () => {
    render(<Leaderboard corridors={[corridorOK]} metric="premium" />);
    expect(document.querySelector('.metric-badge')).not.toHaveClass('premium-negative');
  });

  it('shows high premium warning icon for premium > 100%', () => {
    render(<Leaderboard corridors={[corridorHighPremium]} metric="premium" />);
    expect(screen.getByLabelText('High premium warning')).toBeInTheDocument();
  });

  it('shows USD tag for USD-denominated destinations', () => {
    render(<Leaderboard corridors={[corridorUSD]} metric="composite" />);
    const tag = document.querySelector('.country-tag');
    expect(tag).toBeInTheDocument();
    expect(tag.textContent).toBe('USD');
  });

  it('normalizes KNOMAD country names for display', () => {
    render(<Leaderboard corridors={[corridorEgypt]} metric="composite" />);
    expect(screen.getByText('Egypt')).toBeInTheDocument();
    expect(screen.queryByText('Egypt, Arab Rep.')).not.toBeInTheDocument();
  });

  it('ranks multiple valid corridors descending by composite score', () => {
    render(<Leaderboard corridors={[corridorOK2, corridorOK]} metric="composite" />);
    const rows = document.querySelectorAll('.leaderboard-row');
    expect(rows[0]).toHaveTextContent('India');
    expect(rows[1]).toHaveTextContent('Pakistan');
  });
});
