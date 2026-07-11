const express = require('express');
const rateLimit = require('express-rate-limit');
const { recommendations } = require('../controllers/recommendationsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const recLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many recommendation requests. Please wait a moment and try again.' },
});

router.use(authenticate);
router.get('/', recLimiter, recommendations);

module.exports = router;
