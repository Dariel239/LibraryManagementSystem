const express = require('express');
const rateLimit = require('express-rate-limit');
const { insights } = require('../controllers/insightsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const insightsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many insight requests. Please wait a moment and try again.' },
});

router.use(authenticate);
router.get('/', insightsLimiter, insights);

module.exports = router;
