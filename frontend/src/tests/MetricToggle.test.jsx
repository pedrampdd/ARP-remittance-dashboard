import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetricToggle from '../components/MetricToggle.jsx';

describe('MetricToggle', () => {
  it('renders all three metric buttons', () => {
    render(<MetricToggle value="composite" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Composite' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'USDT Premium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remittance' })).toBeInTheDocument();
  });

  it('renders the Metric label', () => {
    render(<MetricToggle value="composite" onChange={() => {}} />);
    expect(screen.getByText('Metric')).toBeInTheDocument();
  });

  it('applies active class to the selected metric button', () => {
    render(<MetricToggle value="premium" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'USDT Premium' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Composite' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Remittance' })).not.toHaveClass('active');
  });

  it('calls onChange with the key (not label) when clicking Remittance', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MetricToggle value="composite" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Remittance' }));
    expect(onChange).toHaveBeenCalledWith('remittance');
  });

  it('calls onChange with composite key when clicking Composite', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MetricToggle value="premium" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Composite' }));
    expect(onChange).toHaveBeenCalledWith('composite');
  });

  it('calls onChange with premium key when clicking USDT Premium', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MetricToggle value="composite" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'USDT Premium' }));
    expect(onChange).toHaveBeenCalledWith('premium');
  });
});
