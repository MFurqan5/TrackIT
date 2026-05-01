const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
};

// Get user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'Unknown';
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log(`📝 Registration attempt: ${email}`);

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`❌ Registration failed: ${email} already exists`);
      return sendError(res, 'User already exists', 400);
    }

    // Create user with login history in one go
    const user = await User.create({
      name,
      email,
      password,
      lastLoginIP: getClientIP(req),
      loginHistory: [{
        timestamp: new Date(),
        ip: getClientIP(req),
        userAgent: getUserAgent(req)
      }]
    });

    // Generate token
    const token = generateToken(user._id);

    console.log(`✅ User registered successfully: ${email}`);

    sendSuccess(res, {
      _id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      subscriptionTier: user.subscriptionTier,
      token
    }, 'User registered successfully', 201);
    
  } catch (error) {
    console.error(`❌ Registration error: ${error.message}`);
    sendError(res, 'Registration failed', 500, error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔐 Login attempt: ${email}`);

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log(`❌ Login failed: ${email} not found`);
      return sendError(res, 'Invalid credentials', 401);
    }

    // Check if account is active
    if (!user.isActive) {
      console.log(`❌ Login failed: ${email} account deactivated`);
      return sendError(res, 'Account deactivated. Contact support.', 401);
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      console.log(`❌ Login failed: ${email} wrong password`);
      return sendError(res, 'Invalid credentials', 401);
    }

    // Update last login info
    user.lastLogin = new Date();
    user.lastLoginIP = getClientIP(req);
    user.loginHistory.push({
      timestamp: new Date(),
      ip: getClientIP(req),
      userAgent: getUserAgent(req)
    });
    
    // Keep only last 50 login records
    if (user.loginHistory.length > 50) {
      user.loginHistory = user.loginHistory.slice(-50);
    }
    
    await user.save(); // ✅ safe here - password not modified

    // Generate token
    const token = generateToken(user._id);

    console.log(`✅ User logged in: ${email}`);

    sendSuccess(res, {
      _id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      subscriptionTier: user.subscriptionTier,
      preferences: user.preferences,
      token
    }, 'Login successful', 200);
    
  } catch (error) {
    console.error(`❌ Login error: ${error.message}`);
    sendError(res, 'Login failed', 500, error);
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    sendSuccess(res, user, 'User profile retrieved');
  } catch (error) {
    console.error(`❌ Get user error: ${error.message}`);
    sendError(res, 'Failed to get user profile', 500, error);
  }
};

module.exports = { register, login, getMe };