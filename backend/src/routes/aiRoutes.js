const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Stricter limit than the general API limiter, since each request costs an OpenAI API call
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Too many AI queries. Please wait a moment and try again.' },
});

router.use(authenticate);
router.post('/query', aiLimiter, query);

module.exports = router;
