const { validateIntent, buildQuery, summarize, UnrelatedQuestionError } = require('../src/services/aiQueryService');

describe('validateIntent — off-topic guard', () => {
  it('rejects an "unrelated" action with a friendly, specific message instead of running a query', () => {
    expect(() => validateIntent({ action: 'unrelated' })).toThrow(UnrelatedQuestionError);
    expect(() => validateIntent({ action: 'unrelated' })).toThrow(/only answer questions about your book library/);
  });
});

describe('validateIntent', () => {
  it('accepts a valid list intent', () => {
    const result = validateIntent({
      action: 'list',
      order_by: 'price',
      order_dir: 'desc',
      limit: 5,
      filters: {},
    });
    expect(result.action).toBe('list');
    expect(result.limit).toBe(5);
  });

  it('accepts a valid aggregate intent', () => {
    const result = validateIntent({
      action: 'aggregate',
      group_by: 'user',
      metric: 'book_count',
      aggregation: 'count',
      order_dir: 'desc',
      limit: 5,
      filters: {},
    });
    expect(result.group_by).toBe('user');
  });

  it('rejects an unsupported action (prevents arbitrary behavior)', () => {
    expect(() => validateIntent({ action: 'delete', filters: {} })).toThrow('Unsupported query type');
  });

  it('rejects a made-up group_by field the LLM might hallucinate', () => {
    expect(() =>
      validateIntent({
        action: 'aggregate',
        group_by: 'password', // not in whitelist
        metric: 'book_count',
        aggregation: 'count',
        filters: {},
      })
    ).toThrow('Unsupported grouping field');
  });

  it('rejects a made-up metric field', () => {
    expect(() =>
      validateIntent({
        action: 'aggregate',
        group_by: 'user',
        metric: 'ssn', // not in whitelist
        aggregation: 'sum',
        filters: {},
      })
    ).toThrow('Unsupported metric');
  });

  it('clamps limit to the max of 50', () => {
    const result = validateIntent({ action: 'list', limit: 9999, filters: {} });
    expect(result.limit).toBe(50);
  });

  it('rejects an invalid status filter', () => {
    expect(() => validateIntent({ action: 'list', filters: { status: 'DROP TABLE users' } })).toThrow(
      'Unsupported status filter'
    );
  });
});

describe('buildQuery', () => {
  it('scopes non-admin users to their own books regardless of intent', () => {
    const intent = validateIntent({ action: 'list', order_by: 'price', order_dir: 'desc', limit: 5, filters: {} });
    const { sql, params } = buildQuery(intent, { role: 'user', userId: 7 });

    expect(sql).toContain('books.user_id = $1');
    expect(params).toContain(7);
  });

  it('does not scope by user_id for admin', () => {
    const intent = validateIntent({ action: 'list', order_by: 'price', order_dir: 'desc', limit: 5, filters: {} });
    const { sql } = buildQuery(intent, { role: 'admin', userId: 99 });

    expect(sql).not.toMatch(/WHERE books\.user_id/);
  });

  it('builds a parameterized filter for genre (no string interpolation)', () => {
    const intent = validateIntent({
      action: 'list',
      order_by: 'price',
      order_dir: 'desc',
      limit: 5,
      filters: { genre: 'Sci-Fi' },
    });
    const { sql, params } = buildQuery(intent, { role: 'admin', userId: 1 });

    expect(sql).toContain('books.genre ILIKE');
    expect(params).toContain('Sci-Fi');
  });

  it('builds a valid GROUP BY aggregate query', () => {
    const intent = validateIntent({
      action: 'aggregate',
      group_by: 'user',
      metric: 'book_count',
      aggregation: 'count',
      order_dir: 'desc',
      limit: 5,
      filters: {},
    });
    const { sql } = buildQuery(intent, { role: 'admin', userId: 1 });

    expect(sql).toContain('GROUP BY users.name');
    expect(sql).toContain('COUNT(books.id)');
  });
});

describe('summarize', () => {
  it('returns a no-results message for empty rows', () => {
    expect(summarize({ action: 'list' }, [])).toMatch(/No results/);
  });

  it('summarizes a list result', () => {
    const msg = summarize({ action: 'list' }, [{ id: 1 }, { id: 2 }]);
    expect(msg).toMatch(/2 books/);
  });

  it('summarizes an aggregate result using the top row', () => {
    const msg = summarize({ action: 'aggregate' }, [{ group_label: 'Alice', value: 4 }]);
    expect(msg).toContain('Alice');
    expect(msg).toContain('4');
  });
});
