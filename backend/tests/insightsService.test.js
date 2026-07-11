jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../src/config/db');
const { computeUserStats, computeAdminStats, generateInsights } = require('../src/services/insightsService');

describe('computeUserStats', () => {
  it('aggregates only this user\'s books', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi', count: '3' }] }) // genre counts
      .mockResolvedValueOnce({ rows: [{ status: 'completed', count: '2' }] }) // status counts
      .mockResolvedValueOnce({ rows: [{ avg_pages: '350' }] }) // avg pages
      .mockResolvedValueOnce({ rows: [{ count: '4' }] }); // total books

    const stats = await computeUserStats(7);

    expect(stats.scope).toBe('user');
    expect(stats.total_books).toBe(4);
    expect(stats.top_genres[0]).toEqual({ genre: 'Sci-Fi', count: 3 });
    expect(stats.avg_pages).toBe(350);

    // every query should be scoped to user_id = 7
    for (const call of pool.query.mock.calls) {
      expect(call[1]).toEqual([7]);
    }
  });
});

describe('computeAdminStats', () => {
  it('aggregates library-wide data with no user scoping', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ user_count: '4', book_count: '10' }] })
      .mockResolvedValueOnce({ rows: [{ genre: 'Fantasy', count: '5' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Alice Chen', count: '4' }] })
      .mockResolvedValueOnce({ rows: [{ avg_price: '15.50' }] })
      .mockResolvedValueOnce({ rows: [{ status: 'reading', count: '3' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Alice Chen', genre: 'Sci-Fi', count: '3' }] });

    const stats = await computeAdminStats();

    expect(stats.scope).toBe('admin');
    expect(stats.total_users).toBe(4);
    expect(stats.total_books).toBe(10);
    expect(stats.top_readers[0].name).toBe('Alice Chen');
    expect(stats.avg_price).toBe(15.5);
  });
});

describe('generateInsights', () => {
  it('skips the API call entirely when there is no data', async () => {
    const insights = await generateInsights({ total_books: 0 });
    expect(insights[0]).toMatch(/No books yet/);
  });
});
