const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const validateEnv = require('./src/config/validateEnv');
const { generalLimiter } = require('./src/middleware/rateLimiter');
const { sendError } = require('./src/utils/response');
const transactionRoutes = require('./src/routes/transactionRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const userRoutes = require('./src/routes/userRoutes');

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

// Connect to database
connectDB();

// Create express app
const app = express();

//SECURITY MIDDLEWARE
app.use(helmet()); // Security headers

// CORS CONFIGURATION
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// LOGGING
app.use(morgan('combined')); // HTTP request logging

// BODY PARSERS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// RATE LIMITING
app.use('/api', generalLimiter); // Apply to all API routes

// API ROUTES
const authRoutes = require('./src/routes/authRoutes');

// Versioned API routes
app.use(`/api/${process.env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${process.env.API_VERSION}/transactions`, transactionRoutes);
app.use(`/api/${process.env.API_VERSION}/budgets`, budgetRoutes);
app.use(`/api/${process.env.API_VERSION}/analytics`, analyticsRoutes);
app.use(`/api/${process.env.API_VERSION}/users`, userRoutes);
// Also support unversioned routes (backward compatibility)
app.use('/api/auth', authRoutes);

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION
  });
});

// HOME ROUTE
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'TrackIt API',
    version: process.env.API_VERSION,
    status: 'running',
    documentation: '/api-docs',
    endpoints: {
      health: 'GET /health',
      auth: {
        register: `POST /api/${process.env.API_VERSION}/auth/register`,
        login: `POST /api/${process.env.API_VERSION}/auth/login`,
        me: `GET /api/${process.env.API_VERSION}/auth/me`
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 404 HANDLER
app.use((req, res) => {
  sendError(res, `Route ${req.method} ${req.url} not found`, 404);
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(`❌ Unhandled error: ${err.stack}`);
  sendError(res, err.message || 'Internal server error', 500, err);
});

// START SERVER
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 TrackIt API Server Running                          ║
║                                                           ║
║   📡 Port: ${PORT}                                       ║
║   🌍 Environment: ${process.env.NODE_ENV}                ║
║   🔗 URL: http://localhost:${PORT}                       ║
║   📦 API Version: ${process.env.API_VERSION}             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// GRACEFUL SHUTDOWN
const gracefulShutdown = () => {
  console.log('⚠️ Received shutdown signal. Closing server...');
  
  server.close(async () => {
    console.log('✅ Server closed');
    
    try {
      await mongoose.connection.close(false);
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds if not closed
  setTimeout(() => {
    console.error('❌ Could not close connections in time. Forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, server };