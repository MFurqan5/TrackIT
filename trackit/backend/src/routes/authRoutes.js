const express = require('express');
const {
  register,
  verifyEmail,
  resendVerification,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin, checkValidation } = require('../validators/authValidator');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, validateRegister, checkValidation, register);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/login', authLimiter, validateLogin, checkValidation, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Protected routes (require authentication)
router.use(protect);
router.post('/logout', logout);
router.get('/me', getMe);
router.post('/2fa/setup', setupTwoFactor);
router.post('/2fa/verify', verifyTwoFactor);
router.post('/2fa/disable', disableTwoFactor);

module.exports = router;