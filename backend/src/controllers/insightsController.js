const { getInsights } = require('../services/insightsService');

async function insights(req, res) {
  try {
    const scope = { role: req.user.role, userId: req.user.id };
    const result = await getInsights(scope);
    res.json(result);
  } catch (err) {
    console.error('Insights error:', err.message);
    res.status(500).json({ error: 'Could not generate insights right now' });
  }
}

module.exports = { insights };
