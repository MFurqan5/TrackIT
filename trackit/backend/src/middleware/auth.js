const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check cookie (for future implementation)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return sendError(res, 'Not authorized. No token provided.', 401);
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return sendError(res, 'User no longer exists', 401);
    }
    
    if (!user.isActive) {
      return sendError(res, 'Account is deactivated', 401);
    }
    
    // Increment API call counter
    await user.incrementApiCalls();
    
    // Check rate limit for subscription tier
    if (!user.canMakeApiCall()) {
      return sendError(res, 'Daily API limit reached. Upgrade to premium for more requests.', 429);
    }
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error(`❌ Auth error: ${error.message}`);
    
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token', 401);
    }
    
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired. Please login again.', 401);
    }
    
    sendError(res, 'Not authorized', 401, error);
  }
};

// Optional: Role-based authorization for future admin features
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, `User role ${req.user.role} is not authorized`, 403);
    }
    next();
  };
};

module.exports = { protect, authorize };