const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { sendSuccess, sendError } = require('../utils/response');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendLoginAlertEmail
} = require('../services/emailService');

// Generate tokens
const generateTokens = async (user, deviceInfo) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = await RefreshToken.create({
    user: user._id,
    token: RefreshToken.generateToken(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    deviceInfo
  });

  return { accessToken, refreshToken: refreshToken.token };
};

// Get client info
const getClientInfo = (req) => ({
  ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'] || 'Unknown',
  deviceName: req.headers['user-agent']?.split(' ')[0] || 'Unknown Device'
});

// ============ REGISTER ============
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const clientInfo = getClientInfo(req);

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'User already exists', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      ipAddressAtSignup: clientInfo.ip
    });

    // Generate verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    sendVerificationEmail(user.email, user.name, verificationToken).catch(err =>
      console.error('Email sending failed:', err)
    );

    // ✅ No tokens returned - user must verify email first
    sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified // false
      }
    }, 'Registration successful. Please verify your email.', 201);

  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, 'Registration failed', 500, error);
  }
};

// ============ VERIFY EMAIL ============
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findByEmailVerificationToken(token);

    if (!user) {
      return sendError(res, 'Invalid or expired verification token', 400);
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    sendWelcomeEmail(user.email, user.name).catch(err =>
      console.error('Welcome email failed:', err)
    );

    sendSuccess(res, null, 'Email verified successfully! You can now login.');

  } catch (error) {
    console.error('Verification error:', error);
    sendError(res, 'Verification failed', 500, error);
  }
};

// ============ RESEND VERIFICATION ============
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (user.emailVerified) {
      return sendError(res, 'Email already verified', 400);
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    await sendVerificationEmail(user.email, user.name, verificationToken);

    sendSuccess(res, null, 'Verification email sent');

  } catch (error) {
    console.error('Resend verification error:', error);
    sendError(res, 'Failed to send verification email', 500, error);
  }
};

// ============ LOGIN ============
const login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;
    const clientInfo = getClientInfo(req);

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      await User.findOneAndUpdate(
        { email },
        { $push: { loginHistory: { ...clientInfo, successful: false } } }
      );
      return sendError(res, 'Invalid credentials', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account deactivated. Contact support.', 403);
    }

    // ✅ Block login if email not verified
    if (!user.emailVerified) {
      return sendError(res, 'Please verify your email before logging in. Check your inbox.', 403);
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return sendError(res, '2FA code required', 401, null, { requiresTwoFactor: true });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode
      });

      if (!verified) {
        return sendError(res, 'Invalid 2FA code', 401);
      }
    }

    // Send login alert if enabled
    if (user.preferences.loginAlerts) {
      sendLoginAlertEmail(
        user.email,
        user.name,
        clientInfo.ip,
        clientInfo.deviceName,
        new Date().toISOString()
      ).catch(err => console.error('Login alert email failed:', err));
    }

    // Add login history
    await user.addLoginHistory(clientInfo.ip, clientInfo.userAgent, true);

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user, clientInfo);

    sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        currency: user.currency,
        subscriptionTier: user.subscriptionTier
      },
      accessToken,
      refreshToken
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Login failed', 500, error);
  }
};

// ============ REFRESH TOKEN ============
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const clientInfo = getClientInfo(req);

    const refreshTokenDoc = await RefreshToken.findOne({ token, revoked: false });

    if (!refreshTokenDoc || refreshTokenDoc.isExpired()) {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }

    const user = await User.findById(refreshTokenDoc.user);

    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    refreshTokenDoc.lastUsedAt = new Date();
    refreshTokenDoc.usedCount += 1;
    await refreshTokenDoc.save();

    const tokens = await generateTokens(user, clientInfo);

    await refreshTokenDoc.revoke('refreshed');

    sendSuccess(res, tokens, 'Tokens refreshed');

  } catch (error) {
    console.error('Refresh token error:', error);
    sendError(res, 'Failed to refresh tokens', 500, error);
  }
};

// ============ LOGOUT ============
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      const refreshTokenDoc = await RefreshToken.findOne({ token });
      if (refreshTokenDoc) {
        await refreshTokenDoc.revoke('user_logout');
      }
    }

    sendSuccess(res, null, 'Logged out successfully');

  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 'Logout failed', 500, error);
  }
};

// ============ FORGOT PASSWORD ============
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return sendSuccess(res, null, 'If your email is registered, you will receive a reset link');
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    await sendPasswordResetEmail(user.email, user.name, resetToken);

    sendSuccess(res, null, 'Password reset email sent');

  } catch (error) {
    console.error('Forgot password error:', error);
    sendError(res, 'Failed to send reset email', 500, error);
  }
};

// ============ RESET PASSWORD ============
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findByPasswordResetToken(token);

    if (!user) {
      return sendError(res, 'Invalid or expired reset token', 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await RefreshToken.updateMany(
      { user: user._id, revoked: false },
      { revoked: true, revokedReason: 'password_changed' }
    );

    sendSuccess(res, null, 'Password reset successful. Please login with your new password.');

  } catch (error) {
    console.error('Reset password error:', error);
    sendError(res, 'Failed to reset password', 500, error);
  }
};

// ============ ENABLE 2FA ============
const setupTwoFactor = async (req, res) => {
  try {
    const user = req.user;

    const secret = speakeasy.generateSecret({
      name: `TrackIt:${user.email}`
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    const backupCodes = user.generateBackupCodes();
    await user.save();

    sendSuccess(res, {
      qrCode: qrCodeUrl,
      secret: secret.base32,
      backupCodes
    }, '2FA setup initiated. Scan QR code with Google Authenticator.');

  } catch (error) {
    console.error('2FA setup error:', error);
    sendError(res, 'Failed to setup 2FA', 500, error);
  }
};

// ============ VERIFY 2FA ============
const verifyTwoFactor = async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code
    });

    if (!verified) {
      return sendError(res, 'Invalid 2FA code', 400);
    }

    user.twoFactorEnabled = true;
    await user.save();

    sendSuccess(res, null, '2FA enabled successfully');

  } catch (error) {
    console.error('2FA verification error:', error);
    sendError(res, 'Failed to verify 2FA', 500, error);
  }
};

// ============ DISABLE 2FA ============
const disableTwoFactor = async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code
    });

    if (!verified) {
      return sendError(res, 'Invalid 2FA code', 400);
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    sendSuccess(res, null, '2FA disabled successfully');

  } catch (error) {
    console.error('2FA disable error:', error);
    sendError(res, 'Failed to disable 2FA', 500, error);
  }
};

// ============ GET ME ============
// Add this to your existing authController.js file

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // ✅ IMPORTANT: Get user with ALL fields
    const user = await User.findById(req.user._id).select('-password');
    
    console.log('📋 getMe returning user:', {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      occupation: user.occupation,
      monthlyIncome: user.monthlyIncome,
      financialGoal: user.financialGoal,
      avatar: user.avatar,
      currency: user.currency,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      subscriptionTier: user.subscriptionTier
    });
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    sendSuccess(res, user, 'User profile retrieved');
  } catch (error) {
    console.error('Get user error:', error);
    sendError(res, 'Failed to get user profile', 500, error);
  }
};

module.exports = {
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
};