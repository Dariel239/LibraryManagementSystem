const { getRecommendations } = require('../services/recommendationService');

async function recommendations(req, res) {
  try {
    const result = await getRecommendations(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Recommendations error:', err.message);
    res.status(500).json({ error: 'Could not generate recommendations right now' });
  }
}

module.exports = { recommendations };
