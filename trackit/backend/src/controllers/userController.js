const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const bcrypt = require('bcryptjs');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    sendSuccess(res, user);
  } catch (error) {
    sendError(res, 'Failed to get profile', 500, error);
  }
};

// Update user profile
// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, occupation, monthlyIncome, financialGoal } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (monthlyIncome !== undefined) updateData.monthlyIncome = monthlyIncome;
    if (financialGoal !== undefined) updateData.financialGoal = financialGoal;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    console.log('Updated user:', user); // Debug log
    
    sendSuccess(res, user, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 'Failed to update profile', 500, error);
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect', 400);
    }
    
    user.password = newPassword;
    await user.save();
    
    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    sendError(res, 'Failed to change password', 500, error);
  }
};

// Update preferences
const updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences },
      { new: true }
    ).select('-password');
    
    sendSuccess(res, user, 'Preferences updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update preferences', 500, error);
  }
};

// Delete account
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Password is incorrect', 400);
    }
    
    user.isActive = false;
    user.accountDeleted = true;
    user.deletedAt = new Date();
    user.deletionReason = 'user_requested';
    await user.save();
    
    sendSuccess(res, null, 'Account deleted successfully');
  } catch (error) {
    sendError(res, 'Failed to delete account', 500, error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
  deleteAccount
};