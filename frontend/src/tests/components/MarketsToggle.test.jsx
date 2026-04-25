import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarketsToggle from '../../components/MarketsToggle.jsx';

describe('MarketsToggle', () => {
  it('renders all three market buttons', () => {
    render(<MarketsToggle value="All" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UAE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bahrain' })).toBeInTheDocument();
  });

  it('renders the Market label', () => {
    render(<MarketsToggle value="All" onChange={() => {}} />);
    expect(screen.getByText('Market')).toBeInTheDocument();
  });

  it('applies active class only to the selected button', () => {
    render(<MarketsToggle value="UAE" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'UAE' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Bahrain' })).not.toHaveClass('active');
  });

  it('calls onChange with the clicked market value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MarketsToggle value="All" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'UAE' }));
    expect(onChange).toHaveBeenCalledWith('UAE');
  });

  it('calls onChange even when clicking the already-active button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MarketsToggle value="UAE" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'UAE' }));
    expect(onChange).toHaveBeenCalledWith('UAE');
  });
});
