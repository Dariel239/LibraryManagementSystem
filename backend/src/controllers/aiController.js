const { runQuery } = require('../services/aiQueryService');

async function query(req, res) {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'question is required' });
    }
    if (question.length > 300) {
      return res.status(400).json({ error: 'question is too long (max 300 characters)' });
    }

    const scope = { role: req.user.role, userId: req.user.id };
    const result = await runQuery(question.trim(), scope);

    res.json(result);
  } catch (err) {
    console.error('AI query error:', err.message);
    res.status(422).json({ error: err.message || 'Could not process that question' });
  }
}

module.exports = { query };
