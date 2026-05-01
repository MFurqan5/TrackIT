/**
 * Standard API Response Formatter
 * All API responses will use this consistent format
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1'
  });
};

const sendError = (res, message = 'Server Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1'
  };
  
  // Only include error details in development
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message || error;
    response.stack = error.stack;
  }
  
  return res.status(statusCode).json(response);
};

const sendValidationError = (res, errors, message = 'Validation Error') => {
  return res.status(400).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

module.exports = { sendSuccess, sendError, sendValidationError };