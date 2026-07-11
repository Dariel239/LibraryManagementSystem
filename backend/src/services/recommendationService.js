const OpenAI = require('openai');
const pool = require('../config/db');
const { safeJsonCompletion } = require('./llmJson');
const cache = require('./cache');

const RECOMMENDATIONS_TTL_MS = 5 * 60 * 1000; // 5 minutes

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MIN_CANDIDATES = 3;

/**
 * Grounded recommendations: books that already exist in the library (owned by
 * OTHER users), in genres this user reads most, that they don't already own.
 * No LLM involved — this is pure SQL, so there's zero hallucination risk.
 */
async function getGroundedRecommendations(userId) {
  const { rows: topGenres } = await pool.query(
    `SELECT genre, COUNT(*) AS count FROM books
     WHERE user_id = $1 AND genre IS NOT NULL
     GROUP BY genre ORDER BY count DESC LIMIT 3`,
    [userId]
  );

  if (topGenres.length === 0) return { source: 'grounded', recommendations: [] };

  const genreList = topGenres.map((g) => g.genre);

  const { rows: candidates } = await pool.query(
    `SELECT MIN(books.title) AS title, MIN(books.author) AS author, MIN(books.genre) AS genre,
            ROUND(AVG(books.rating), 1) AS avg_rating,
            COUNT(*) AS copies
     FROM books
     WHERE books.genre ILIKE ANY($1)
       AND books.user_id != $2
       AND NOT EXISTS (
         SELECT 1 FROM books own
         WHERE own.user_id = $2
           AND LOWER(own.title) = LOWER(books.title)
           AND LOWER(own.author) = LOWER(books.author)
       )
     GROUP BY LOWER(books.title), LOWER(books.author), LOWER(books.genre)
     ORDER BY avg_rating DESC NULLS LAST, copies DESC
     LIMIT 10`,
    [genreList, userId]
  );

  return {
    source: 'grounded',
    recommendations: candidates.map((c) => ({
      title: c.title,
      author: c.author,
      genre: c.genre,
      avg_rating: c.avg_rating ? Number(c.avg_rating) : null,
      rated_by: Number(c.copies),
      reason: c.avg_rating
        ? `Rated ${c.avg_rating}/5 on average by ${c.copies} reader${c.copies === '1' ? '' : 's'} — matches your interest in ${c.genre}.`
        : `Matches your interest in ${c.genre}.`,
    })),
  };
}

/**
 * Generative fallback: only used when the library doesn't have enough grounded
 * candidates. Clearly labeled as AI-suggested and unverified against a real catalog.
 */
async function getGenerativeRecommendations(genres) {
  if (genres.length === 0) {
    return { source: 'generative', recommendations: [] };
  }

  try {
    const parsed = await safeJsonCompletion(openai, {
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: `Suggest 3 real, well-known published books matching the given genres. Use only genuinely published books you are confident exist — do not invent titles or authors. Return ONLY a raw JSON object, no markdown, no extra commentary: {"recommendations": [{"title": string, "author": string, "genre": string, "reason": string}]}.`,
        },
        { role: 'user', content: `Genres: ${genres.join(', ')}` },
      ],
      temperature: 0.5,
      max_tokens: 400,
    });
    return {
      source: 'generative',
      recommendations: (parsed.recommendations || []).map((r) => ({ ...r, unverified: true })),
    };
  } catch (err) {
    return { source: 'generative', recommendations: [] };
  }
}

async function getRecommendations(userId) {
  const cacheKey = `recommendations:${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const grounded = await getGroundedRecommendations(userId);

  if (grounded.recommendations.length >= MIN_CANDIDATES) {
    cache.set(cacheKey, grounded, RECOMMENDATIONS_TTL_MS);
    return grounded;
  }

  // Not enough data in the library yet — fall back to generative, but merge
  // with any grounded results we did find (grounded ones come first).
  const { rows: topGenres } = await pool.query(
    `SELECT genre FROM books WHERE user_id = $1 AND genre IS NOT NULL
     GROUP BY genre ORDER BY COUNT(*) DESC LIMIT 3`,
    [userId]
  );
  const genreNames = topGenres.map((g) => g.genre);
  const generative = await getGenerativeRecommendations(genreNames);

  const result = {
    source: grounded.recommendations.length > 0 ? 'mixed' : 'generative',
    recommendations: [...grounded.recommendations, ...generative.recommendations],
  };
  cache.set(cacheKey, result, RECOMMENDATIONS_TTL_MS);
  return result;
}

module.exports = { getGroundedRecommendations, getGenerativeRecommendations, getRecommendations };
