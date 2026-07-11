const cache = require('../src/services/cache');

describe('cache', () => {
  afterEach(() => {
    cache.invalidate('a');
    cache.invalidate('b');
    cache.invalidateForBookChange(1);
    cache.invalidateForBookChange(2);
  });

  it('stores and retrieves a value before expiry', () => {
    cache.set('a', { hello: 'world' }, 10_000);
    expect(cache.get('a')).toEqual({ hello: 'world' });
  });

  it('returns undefined for a missing key', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('expires a value after its TTL passes', async () => {
    cache.set('a', 'value', 10); // 10ms TTL
    await new Promise((r) => setTimeout(r, 20));
    expect(cache.get('a')).toBeUndefined();
  });

  it('invalidateForBookChange clears that user\'s insights, recommendations, and the shared admin insights', () => {
    cache.set('insights:user:1', 'stale-user-insights', 10_000);
    cache.set('recommendations:1', 'stale-recs', 10_000);
    cache.set('insights:admin', 'stale-admin-insights', 10_000);
    cache.set('insights:user:2', 'other-user-untouched', 10_000);

    cache.invalidateForBookChange(1);

    expect(cache.get('insights:user:1')).toBeUndefined();
    expect(cache.get('recommendations:1')).toBeUndefined();
    expect(cache.get('insights:admin')).toBeUndefined();
    expect(cache.get('insights:user:2')).toBe('other-user-untouched');
  });
});
