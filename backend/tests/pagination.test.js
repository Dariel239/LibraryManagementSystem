const { parsePagination, buildMeta } = require('../src/utils/pagination');

describe('parsePagination', () => {
  it('defaults to page 1, limit 20 when nothing is provided', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20 });
  });

  it('parses valid page/limit from query params', () => {
    expect(parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10 });
  });

  it('clamps limit to the max of 100', () => {
    expect(parsePagination({ limit: '9999' })).toEqual({ page: 1, limit: 100 });
  });

  it('clamps page below 1 up to 1', () => {
    expect(parsePagination({ page: '-5' })).toEqual({ page: 1, limit: 20 });
  });

  it('falls back to defaults for non-numeric input', () => {
    expect(parsePagination({ page: 'abc', limit: 'xyz' })).toEqual({ page: 1, limit: 20 });
  });
});

describe('buildMeta', () => {
  it('computes totalPages correctly', () => {
    expect(buildMeta({ page: 1, limit: 20, total: 45 })).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('returns at least 1 totalPage even when total is 0', () => {
    expect(buildMeta({ page: 1, limit: 20, total: 0 }).totalPages).toBe(1);
  });
});
