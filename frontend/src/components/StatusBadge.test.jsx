import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders human-readable labels for each known status', () => {
    render(<StatusBadge status="to-read" />);
    expect(screen.getByText('To Read')).toBeInTheDocument();
  });

  it('renders "Reading" for the reading status', () => {
    render(<StatusBadge status="reading" />);
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('renders "Completed" for the completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('falls back to showing the raw value for an unrecognized status', () => {
    render(<StatusBadge status="weird-status" />);
    expect(screen.getByText('weird-status')).toBeInTheDocument();
  });
});
