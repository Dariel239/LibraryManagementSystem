/**
 * Simple in-memory TTL cache. Good enough for a single-process deployment;
 * a multi-instance production deployment would swap this for Redis, but the
 * interface would stay the same.
 */
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function invalidate(key) {
  store.delete(key);
}

/**
 * Clears every cache entry that could be stale after a book was created,
 * edited, or deleted for the given owner: that user's personal insights and
 * recommendations, plus the shared admin-wide insights view (library totals
 * changed for everyone, regardless of who owns the book).
 */
function invalidateForBookChange(ownerId) {
  store.delete(`insights:user:${ownerId}`);
  store.delete(`recommendations:${ownerId}`);
  store.delete('insights:admin');
}

module.exports = { get, set, invalidate, invalidateForBookChange };
