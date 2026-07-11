const OpenAI = require('openai');
const pool = require('../config/db');
const { safeJsonCompletion } = require('./llmJson');
const cache = require('./cache');

const INSIGHTS_TTL_MS = 5 * 60 * 1000; // 5 minutes

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// --- Simple per-user stats: just this user's own library ---
async function computeUserStats(userId) {
  const [genreCounts, statusCounts, avgPages, totalBooks] = await Promise.all([
    pool.query(
      `SELECT genre, COUNT(*) AS count FROM books
       WHERE user_id = $1 AND genre IS NOT NULL
       GROUP BY genre ORDER BY count DESC LIMIT 3`,
      [userId]
    ),
    pool.query(
      `SELECT status, COUNT(*) AS count FROM books
       WHERE user_id = $1 GROUP BY status`,
      [userId]
    ),
    pool.query(`SELECT ROUND(AVG(pages)) AS avg_pages FROM books WHERE user_id = $1 AND pages IS NOT NULL`, [
      userId,
    ]),
    pool.query('SELECT COUNT(*) AS count FROM books WHERE user_id = $1', [userId]),
  ]);

  return {
    scope: 'user',
    total_books: Number(totalBooks.rows[0].count),
    top_genres: genreCounts.rows.map((r) => ({ genre: r.genre, count: Number(r.count) })),
    status_breakdown: statusCounts.rows.map((r) => ({ status: r.status, count: Number(r.count) })),
    avg_pages: avgPages.rows[0].avg_pages ? Number(avgPages.rows[0].avg_pages) : null,
  };
}

// --- Richer admin-wide stats: whole-library view ---
async function computeAdminStats() {
  const [totals, topGenre, topReader, avgPrice, statusBreakdown, mostActiveGenrePerUser] = await Promise.all([
    pool.query('SELECT (SELECT COUNT(*) FROM users) AS user_count, (SELECT COUNT(*) FROM books) AS book_count'),
    pool.query(
      `SELECT genre, COUNT(*) AS count FROM books
       WHERE genre IS NOT NULL GROUP BY genre ORDER BY count DESC LIMIT 3`
    ),
    pool.query(
      `SELECT users.name, COUNT(books.id) AS count
       FROM books JOIN users ON books.user_id = users.id
       GROUP BY users.name ORDER BY count DESC LIMIT 3`
    ),
    pool.query('SELECT ROUND(AVG(price), 2) AS avg_price FROM books WHERE price IS NOT NULL'),
    pool.query('SELECT status, COUNT(*) AS count FROM books GROUP BY status'),
    pool.query(
      `SELECT users.name, books.genre, COUNT(*) AS count
       FROM books JOIN users ON books.user_id = users.id
       WHERE books.genre IS NOT NULL
       GROUP BY users.name, books.genre
       ORDER BY count DESC LIMIT 3`
    ),
  ]);

  return {
    scope: 'admin',
    total_users: Number(totals.rows[0].user_count),
    total_books: Number(totals.rows[0].book_count),
    top_genres_library_wide: topGenre.rows.map((r) => ({ genre: r.genre, count: Number(r.count) })),
    top_readers: topReader.rows.map((r) => ({ name: r.name, count: Number(r.count) })),
    avg_price: avgPrice.rows[0].avg_price ? Number(avgPrice.rows[0].avg_price) : null,
    status_breakdown: statusBreakdown.rows.map((r) => ({ status: r.status, count: Number(r.count) })),
    top_user_genre_pairs: mostActiveGenrePerUser.rows.map((r) => ({
      user: r.name,
      genre: r.genre,
      count: Number(r.count),
    })),
  };
}

async function generateInsights(stats) {
  // If there's no data yet, skip the API call entirely
  if (stats.total_books === 0) {
    return ['No books yet — add some to your library to see insights here.'];
  }

  try {
    const parsed = await safeJsonCompletion(openai, {
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: `You write short, friendly insights about library reading data. You will be given a JSON object of pre-computed statistics — never invent numbers not present in the JSON. Return ONLY a raw JSON object, no markdown, no extra commentary: {"insights": ["insight 1", "insight 2"]} with 2-4 short, punchy one-sentence insights.`,
        },
        { role: 'user', content: JSON.stringify(stats) },
      ],
      temperature: 0.4,
      max_tokens: 300,
    });
    return Array.isArray(parsed.insights) ? parsed.insights : [];
  } catch (err) {
    return ['Insights could not be generated right now — please try again shortly.'];
  }
}

async function getInsights(scope) {
  const cacheKey = scope.role === 'admin' ? 'insights:admin' : `insights:user:${scope.userId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const stats = scope.role === 'admin' ? await computeAdminStats() : await computeUserStats(scope.userId);
  const insights = await generateInsights(stats);
  const result = { stats, insights };

  cache.set(cacheKey, result, INSIGHTS_TTL_MS);
  return result;
}

module.exports = { computeUserStats, computeAdminStats, generateInsights, getInsights };
