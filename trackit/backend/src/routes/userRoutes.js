const express = require('express');
const {
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
  deleteAccount
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.put('/preferences', updatePreferences);
router.delete('/account', deleteAccount);

module.exports = router;