const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Parses ?page= and ?limit= from a request, clamping to sane bounds. */
function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit };
}

function buildMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

module.exports = { parsePagination, buildMeta };
