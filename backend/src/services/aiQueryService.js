const OpenAI = require('openai');
const pool = require('../config/db');
const { safeJsonCompletion } = require('./llmJson');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// --- Whitelists: the LLM can only ever select from these, never write raw SQL ---
const METRIC_COLUMNS = {
  price: 'price',
  pages: 'pages',
  rating: 'rating',
};

const GROUP_BY_COLUMNS = {
  user: 'users.name',
  genre: 'books.genre',
  status: 'books.status',
  title: 'books.title',
};

const LIST_ORDER_COLUMNS = {
  price: 'books.price',
  pages: 'books.pages',
  rating: 'books.rating',
  created_at: 'books.created_at',
  title: 'books.title',
};

const AGGREGATIONS = ['count', 'sum', 'avg', 'max', 'min'];

const SYSTEM_PROMPT = `You are a query intent extractor for a library management system. Convert the user's natural language question into a JSON object ONLY — no prose, no markdown fences.

Schema:
{
  "action": "list" | "aggregate" | "unrelated",
  "filters": { "genre": string|null, "status": "to-read"|"reading"|"completed"|null, "author": string|null },

  // required when action = "list" (returns individual books):
  "order_by": "price" | "pages" | "rating" | "created_at" | "title" | null,
  "order_dir": "asc" | "desc",
  "limit": integer (default 10, max 50),

  // required when action = "aggregate" (returns grouped/summary stats):
  "group_by": "user" | "genre" | "status" | "title" | null,
  "metric": "price" | "pages" | "rating" | "book_count",
  "aggregation": "count" | "sum" | "avg" | "max" | "min"
}

Rules:
- "who owns the most books" -> aggregate, group_by=user, metric=book_count, aggregation=count, order_dir=desc, limit=5
- "most popular book" -> aggregate, group_by=title, metric=book_count, aggregation=count, order_dir=desc, limit=1
- "most expensive books" / "top 5 priciest" -> list, order_by=price, order_dir=desc, limit=5
- "average pages per genre" -> aggregate, group_by=genre, metric=pages, aggregation=avg
- If a number of results is mentioned (e.g. "top 5"), use it as limit.
- If genre/status/author are mentioned, put them in filters; otherwise null.
- Only use values from the schema above. Never invent new fields.
- IMPORTANT: this system ONLY answers questions about the user's book library (titles, authors, genres, reading status, pages, price, rating, ownership). If the question is unrelated to books/library data — small talk, opinions, general knowledge, anything not about the library — respond with {"action": "unrelated"} and nothing else. Do not guess a book query for off-topic input.
- Respond with JSON only.`;

async function extractIntent(question) {
  const intent = await safeJsonCompletion(openai, {
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question },
    ],
    temperature: 0,
    max_tokens: 300,
  });
  return intent;
}

class UnrelatedQuestionError extends Error {}

function validateIntent(intent) {
  if (intent.action === 'unrelated') {
    throw new UnrelatedQuestionError(
      "I can only answer questions about your book library — things like genres, authors, reading status, or who owns what. Try asking something like \"most expensive books\" or \"what genre do I read most?\""
    );
  }

  if (!['list', 'aggregate'].includes(intent.action)) {
    throw new Error('Unsupported query type.');
  }

  const filters = intent.filters || {};
  if (filters.status && !['to-read', 'reading', 'completed'].includes(filters.status)) {
    throw new Error('Unsupported status filter.');
  }

  if (intent.action === 'list') {
    if (intent.order_by && !LIST_ORDER_COLUMNS[intent.order_by]) {
      throw new Error('Unsupported sort field.');
    }
  } else {
    if (intent.group_by && !GROUP_BY_COLUMNS[intent.group_by]) {
      throw new Error('Unsupported grouping field.');
    }
    if (intent.metric !== 'book_count' && !METRIC_COLUMNS[intent.metric]) {
      throw new Error('Unsupported metric.');
    }
    if (!AGGREGATIONS.includes(intent.aggregation)) {
      throw new Error('Unsupported aggregation.');
    }
  }

  const limit = Math.min(Math.max(parseInt(intent.limit, 10) || 10, 1), 50);
  return { ...intent, limit };
}

/**
 * Builds a fully parameterized SQL query from a validated intent.
 * scope: { role, userId } — non-admins are always locked to their own user_id,
 * regardless of what the LLM extracted.
 */
function buildQuery(intent, scope) {
  const params = [];
  const whereClauses = [];

  if (scope.role !== 'admin') {
    params.push(scope.userId);
    whereClauses.push(`books.user_id = $${params.length}`);
  }

  const filters = intent.filters || {};
  if (filters.genre) {
    params.push(filters.genre);
    whereClauses.push(`books.genre ILIKE $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    whereClauses.push(`books.status = $${params.length}`);
  }
  if (filters.author) {
    params.push(`%${filters.author}%`);
    whereClauses.push(`books.author ILIKE $${params.length}`);
  }

  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  if (intent.action === 'list') {
    const orderCol = LIST_ORDER_COLUMNS[intent.order_by] || 'books.created_at';
    const orderDir = intent.order_dir === 'asc' ? 'ASC' : 'DESC';

    const sql = `
      SELECT books.id, books.title, books.author, books.genre, books.status,
             books.pages, books.price, books.rating, users.name AS owner_name
      FROM books
      JOIN users ON books.user_id = users.id
      ${whereSQL}
      ORDER BY ${orderCol} ${orderDir}
      LIMIT ${intent.limit}
    `;
    return { sql, params };
  }

  // aggregate
  const groupCol = intent.group_by ? GROUP_BY_COLUMNS[intent.group_by] : null;
  const aggExpr =
    intent.metric === 'book_count'
      ? 'COUNT(books.id)'
      : `${intent.aggregation.toUpperCase()}(books.${METRIC_COLUMNS[intent.metric]})`;

  const selectGroup = groupCol ? `${groupCol} AS group_label,` : '';
  const groupBySQL = groupCol ? `GROUP BY ${groupCol}` : '';
  const orderDir = intent.order_dir === 'asc' ? 'ASC' : 'DESC';

  const sql = `
    SELECT ${selectGroup} ${aggExpr} AS value
    FROM books
    JOIN users ON books.user_id = users.id
    ${whereSQL}
    ${groupBySQL}
    ORDER BY value ${orderDir}
    LIMIT ${intent.limit}
  `;
  return { sql, params };
}

function summarize(intent, rows) {
  if (rows.length === 0) return 'No results found for that query.';

  if (intent.action === 'list') {
    return `Found ${rows.length} book${rows.length === 1 ? '' : 's'} matching your query.`;
  }

  const top = rows[0];
  const label = top.group_label ? `"${top.group_label}"` : 'the result';
  return `Top result: ${label} with a value of ${top.value}.`;
}

async function runQuery(question, scope) {
  const rawIntent = await extractIntent(question);
  const intent = validateIntent(rawIntent);
  const { sql, params } = buildQuery(intent, scope);
  const { rows } = await pool.query(sql, params);

  return {
    intent,
    results: rows,
    summary: summarize(intent, rows),
  };
}

module.exports = { runQuery, extractIntent, validateIntent, buildQuery, summarize, UnrelatedQuestionError };
