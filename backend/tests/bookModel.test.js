jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../src/config/db');
const BookModel = require('../src/models/bookModel');

describe('BookModel', () => {
  afterEach(() => jest.clearAllMocks());

  it('findByUser queries books scoped to a single user_id, paginated', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, user_id: 7, title: 'Dune', total_count: '1' }] });

    const { rows, total } = await BookModel.findByUser(7, { page: 1, limit: 20 });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1'), [7, 20, 0]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('total_count'); // stripped from the returned rows
    expect(total).toBe(1);
  });

  it('findByUser returns total 0 with an empty rows array when there are no matches', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const { rows, total } = await BookModel.findByUser(7, { page: 1, limit: 20 });
    expect(rows).toEqual([]);
    expect(total).toBe(0);
  });

  it('update builds a dynamic SET clause from provided fields only', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 3, title: 'New Title', status: 'reading' }] });

    await BookModel.update(3, { title: 'New Title', status: 'reading' });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('title = $1');
    expect(sql).toContain('status = $2');
    expect(params).toEqual(['New Title', 'reading', 3]);
  });

  it('update with no fields short-circuits to findById without writing', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 3, title: 'Unchanged' }] });

    await BookModel.update(3, {});

    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM books WHERE id = $1', [3]);
  });
});
