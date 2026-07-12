import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GenreBarChart, StatusPieChart } from '../components/DashboardCharts';

describe('GenreBarChart', () => {
  it('renders nothing when given no genres', () => {
    const { container } = render(<GenreBarChart genres={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when genres is undefined', () => {
    const { container } = render(<GenreBarChart />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a chart container when given genre data', () => {
    const { container } = render(
      <GenreBarChart genres={[{ genre: 'Sci-Fi', count: 5 }, { genre: 'Fantasy', count: 3 }]} />
    );
    // recharts renders an outer responsive container div even without real layout in jsdom
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});

describe('StatusPieChart', () => {
  it('renders nothing when given no status breakdown', () => {
    const { container } = render(<StatusPieChart statusBreakdown={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a chart container when given status data', () => {
    const { container } = render(
      <StatusPieChart statusBreakdown={[{ status: 'reading', count: 2 }, { status: 'completed', count: 4 }]} />
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
