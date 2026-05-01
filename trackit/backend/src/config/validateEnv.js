const requiredEnvVars = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'NODE_ENV'
];

const validateEnv = () => {
  const missing = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
  }
  
  console.log('✅ All environment variables are present');
  
  // Warning for weak JWT secret in production
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'trackit_super_secret_key_change_this_in_production_2024') {
    console.warn('⚠️ WARNING: You are using default JWT_SECRET in production! Change it immediately!');
  }
};

module.exports = validateEnv;