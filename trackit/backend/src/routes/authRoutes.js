const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin, checkValidation } = require('../validators/authValidator');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes (with rate limiting and validation)
router.post('/register', authLimiter, validateRegister, checkValidation, register);
router.post('/login', authLimiter, validateLogin, checkValidation, login);

// Protected route
router.get('/me', protect, getMe);

module.exports = router;