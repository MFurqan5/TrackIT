const express = require('express');
const {
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
  deleteAccount,
  uploadAvatar
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadAvatar: avatarUploadMiddleware } = require('../config/cloudinary');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.put('/preferences', updatePreferences);
router.delete('/account', deleteAccount);
router.post('/avatar', avatarUploadMiddleware.single('avatar'), uploadAvatar);

module.exports = router;