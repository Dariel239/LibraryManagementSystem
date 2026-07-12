const { parseListQuery, SORTABLE_COLUMNS } = require('../src/utils/listQuery');

describe('parseListQuery', () => {
  it('defaults to created_at desc with empty search when nothing is provided', () => {
    expect(parseListQuery({})).toEqual({
      search: '',
      sortBy: 'created_at',
      sortColumn: 'books.created_at',
      sortDir: 'DESC',
    });
  });

  it('parses a valid sortBy/sortDir combination', () => {
    const result = parseListQuery({ sortBy: 'price', sortDir: 'asc' });
    expect(result.sortColumn).toBe('books.price');
    expect(result.sortDir).toBe('ASC');
  });

  it('falls back to created_at for an unrecognized sortBy (prevents SQL injection via ORDER BY)', () => {
    const result = parseListQuery({ sortBy: 'user_id); DROP TABLE books; --' });
    expect(result.sortBy).toBe('created_at');
    expect(result.sortColumn).toBe('books.created_at');
  });

  it('defaults sortDir to DESC for anything other than exactly "asc"', () => {
    expect(parseListQuery({ sortDir: 'ASCENDING' }).sortDir).toBe('DESC');
    expect(parseListQuery({ sortDir: 'garbage' }).sortDir).toBe('DESC');
  });

  it('trims and caps search length', () => {
    const result = parseListQuery({ search: '  dune  ' });
    expect(result.search).toBe('dune');
  });

  it('caps search at 200 characters', () => {
    const long = 'x'.repeat(300);
    const result = parseListQuery({ search: long });
    expect(result.search).toHaveLength(200);
  });

  it('ignores non-string search values', () => {
    expect(parseListQuery({ search: { evil: true } }).search).toBe('');
  });

  it('every SORTABLE_COLUMNS value is properly table-qualified', () => {
    for (const col of Object.values(SORTABLE_COLUMNS)) {
      expect(col).toMatch(/^books\./);
    }
  });
});
