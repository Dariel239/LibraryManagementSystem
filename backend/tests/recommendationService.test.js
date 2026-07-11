jest.mock('../src/services/cache', () => ({
  get: jest.fn(() => undefined),
  set: jest.fn(),
  invalidate: jest.fn(),
  invalidateForBookChange: jest.fn(),
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  recommendations: [
                    { title: 'Neuromancer', author: 'William Gibson', genre: 'Sci-Fi', reason: 'Genre match' },
                  ],
                }),
              },
            },
          ],
        }),
      },
    },
  }));
});

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../src/config/db');
const {
  getGroundedRecommendations,
  getRecommendations,
} = require('../src/services/recommendationService');

describe('getGroundedRecommendations', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns an empty list when the user has no genre history', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // top genres query
    const result = await getGroundedRecommendations(1);
    expect(result.source).toBe('grounded');
    expect(result.recommendations).toEqual([]);
  });

  it('finds candidates from other users in matching genres, excluding own titles, aggregated by rating', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi', count: '3' }] }) // top genres
      .mockResolvedValueOnce({
        rows: [{ title: 'Foundation', author: 'Isaac Asimov', genre: 'Sci-Fi', avg_rating: '4.3', copies: '2' }],
      }); // candidates

    const result = await getGroundedRecommendations(1);
    expect(result.recommendations[0].title).toBe('Foundation');
    expect(result.recommendations[0].avg_rating).toBe(4.3);
    expect(result.recommendations[0].rated_by).toBe(2);
    expect(result.recommendations[0].reason).toMatch(/4\.3\/5/);

    // second query must exclude the requesting user's own books
    const [, params] = pool.query.mock.calls[1];
    expect(params).toEqual([['Sci-Fi'], 1]);
  });

  it('excludes on title+author match, and groups title/author/genre case-insensitively', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi', count: '2' }] })
      .mockResolvedValueOnce({
        rows: [{ title: 'Dune', author: 'Frank Herbert', genre: 'Sci-Fi', avg_rating: '4.5', copies: '1' }],
      });

    await getGroundedRecommendations(1);

    const [sql] = pool.query.mock.calls[1];
    expect(sql).toContain('LOWER(own.title) = LOWER(books.title)');
    expect(sql).toContain('LOWER(own.author) = LOWER(books.author)');
    expect(sql).toContain('GROUP BY LOWER(books.title), LOWER(books.author), LOWER(books.genre)');
    expect(sql).toContain('books.genre ILIKE ANY($1)');
  });

  it('does not exclude a same-titled book by a different author', async () => {
    // Documents the fix: exclusion requires title AND author to match, not title alone.
    pool.query
      .mockResolvedValueOnce({ rows: [{ genre: 'Classic', count: '1' }] })
      .mockResolvedValueOnce({
        rows: [{ title: 'Emma', author: 'Some Other Author', genre: 'Classic', avg_rating: '4.0', copies: '1' }],
      });

    const result = await getGroundedRecommendations(1);
    expect(result.recommendations[0].author).toBe('Some Other Author');

    const [sql] = pool.query.mock.calls[1];
    // exclusion must require BOTH title and author to match — not title alone
    expect(sql).toMatch(/LOWER\(own\.title\)[\s\S]*LOWER\(own\.author\)/);
  });
});

describe('excludeOwned', () => {
  const { excludeOwned } = require('../src/services/recommendationService');

  it('removes a recommendation matching an owned title+author, case-insensitively', () => {
    const owned = new Set(['dune|frank herbert']);
    const recs = [
      { title: 'Dune', author: 'Frank Herbert' },
      { title: 'Foundation', author: 'Isaac Asimov' },
    ];
    expect(excludeOwned(recs, owned)).toEqual([{ title: 'Foundation', author: 'Isaac Asimov' }]);
  });

  it('keeps a same-titled book by a different author', () => {
    const owned = new Set(['emma|jane austen']);
    const recs = [{ title: 'Emma', author: 'Some Other Author' }];
    expect(excludeOwned(recs, owned)).toHaveLength(1);
  });
});
describe('getRecommendations (source selection)', () => {
  afterEach(() => jest.clearAllMocks());

  it('uses grounded results when there are enough candidates (>=3)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // owned set (user owns nothing, for simplicity)
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi', count: '3' }] }) // top genres
      .mockResolvedValueOnce({
        rows: [
          { title: 'A', author: 'X', genre: 'Sci-Fi', avg_rating: '4.0', copies: '1' },
          { title: 'B', author: 'Y', genre: 'Sci-Fi', avg_rating: '4.0', copies: '1' },
          { title: 'C', author: 'Z', genre: 'Sci-Fi', avg_rating: '4.0', copies: '1' },
        ],
      });

    const result = await getRecommendations(1);
    expect(result.source).toBe('grounded');
    expect(result.recommendations).toHaveLength(3);
  });

  it('falls back to generative (marked unverified) when grounded candidates are insufficient', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // owned set
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi', count: '1' }] }) // top genres (grounded)
      .mockResolvedValueOnce({ rows: [] }) // candidates: none found
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi' }] }); // top genres again for generative

    const result = await getRecommendations(1);
    expect(result.source).toBe('generative');
    expect(result.recommendations[0].unverified).toBe(true);
  });

  it('filters out a generative suggestion that matches a book the user already owns', async () => {
    // The mocked OpenAI client above always suggests "Neuromancer" by William Gibson.
    pool.query
      .mockResolvedValueOnce({ rows: [{ title: 'Neuromancer', author: 'William Gibson' }] }) // owned set: user already owns it
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi', count: '1' }] }) // top genres (grounded)
      .mockResolvedValueOnce({ rows: [] }) // no grounded candidates
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi' }] }); // top genres for generative

    const result = await getRecommendations(1);

    // the AI suggested a book the user already owns — it must be filtered out, not shown
    expect(result.recommendations.find((r) => r.title === 'Neuromancer')).toBeUndefined();
  });

  it('keeps a generative suggestion the user does not already own', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ title: 'Some Other Book', author: 'Some Other Author' }] }) // owned set
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi', count: '1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ genre: 'Sci-Fi' }] });

    const result = await getRecommendations(1);
    expect(result.recommendations.find((r) => r.title === 'Neuromancer')).toBeDefined();
  });
});
