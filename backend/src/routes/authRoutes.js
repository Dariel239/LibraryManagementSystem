const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me, updateProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Tighter than the general API limiter — credential-stuffing / brute-force protection.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, me);
router.put('/me', authenticate, updateProfile);
router.put('/me/password', authenticate, changePassword);

module.exports = router;
