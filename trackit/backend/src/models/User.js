const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // ============ BASIC INFO ============
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  
  // ============ CONTACT INFO ============
  phoneNumber: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
    default: null
  },
  
  // ============ PROFILE ============
  avatar: { type: String, default: null },
  avatarPublicId: { type: String, default: null },
  
  dateOfBirth: { type: Date, default: null },
  
  occupation: {
    type: String,
    enum: ['Student', 'Employed', 'Self-Employed', 'Business Owner', 'Retired', 'Unemployed', 'Other'],
    default: 'Other'
  },
  
  // ============ FINANCIAL ============
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']
  },
  
  monthlyIncome: { type: Number, min: 0, default: 0 },
  
  financialGoal: {
    type: String,
    enum: ['Save Money', 'Pay Debt', 'Invest', 'Retire Early', 'Buy House', 'Other'],
    default: 'Save Money'
  },
  
  // ============ EMAIL VERIFICATION ============
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // ============ PASSWORD RESET ============
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // ============ TWO FACTOR AUTH ============
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  twoFactorBackupCodes: [String],
  
  // ============ SESSION MANAGEMENT ============
  lastLogin: { type: Date, default: null },
  lastLoginIP: { type: String, default: null },
  lastLoginDevice: { type: String, default: null },
  
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
    deviceName: String,
    location: String,
    successful: { type: Boolean, default: true }
  }],
  
  activeSessions: [{
    sessionId: String,
    token: String,
    deviceName: String,
    ip: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    lastActive: Date
  }],
  
  // ============ NOTIFICATIONS ============
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: false },
    loginAlerts: { type: Boolean, default: true }
  },
  
  // ============ ACCOUNT STATUS ============
  isActive: { type: Boolean, default: true },
  accountDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletionReason: { type: String, default: null },
  
  // ============ SUBSCRIPTION ============
  subscriptionTier: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  
  subscriptionExpiresAt: { type: Date, default: null },
  
  // ============ API USAGE ============
  apiCallsToday: { type: Number, default: 0 },
  lastApiReset: { type: Date, default: Date.now },
  
  // ============ AUDIT ============
  createdBy: { type: String, default: 'self' },
  updatedBy: { type: String, default: null },
  ipAddressAtSignup: { type: String, default: null }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============ INDEXES ============
userSchema.index({ email: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ subscriptionTier: 1 });

// ============ PRE-SAVE HOOKS ============
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.pre('save', function() {
  const now = new Date();
  const lastReset = this.lastApiReset;
  if (lastReset && now.getDate() !== lastReset.getDate()) {
    this.apiCallsToday = 0;
    this.lastApiReset = now;
  }
});

// ============ METHODS ============

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
  return token;
};

// Generate 2FA backup codes
userSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  this.twoFactorBackupCodes = codes.map(code => crypto.createHash('sha256').update(code).digest('hex'));
  return codes;
};

// Verify 2FA backup code
userSchema.methods.verifyBackupCode = async function(code) {
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  const index = this.twoFactorBackupCodes.indexOf(hashedCode);
  if (index !== -1) {
    this.twoFactorBackupCodes.splice(index, 1);
    await this.save();
    return true;
  }
  return false;
};

// Add login history
userSchema.methods.addLoginHistory = async function(ip, userAgent, successful = true) {
  this.loginHistory.push({
    timestamp: new Date(),
    ip,
    userAgent,
    successful
  });
  
  // Keep only last 100 records
  if (this.loginHistory.length > 100) {
    this.loginHistory = this.loginHistory.slice(-100);
  }
  
  if (successful) {
    this.lastLogin = new Date();
    this.lastLoginIP = ip;
    this.lastLoginDevice = userAgent;
  }
  
  await this.save();
};

// Increment API calls
userSchema.methods.incrementApiCalls = async function() {
  this.apiCallsToday += 1;
  await this.save();
};

// Check if can make API call
userSchema.methods.canMakeApiCall = function() {
  const limits = { free: 1000, premium: 10000, enterprise: 100000 };
  const limit = limits[this.subscriptionTier] || 100;
  return this.apiCallsToday < limit;
};

// Soft delete account
userSchema.methods.softDelete = async function(reason = 'user_requested') {
  this.isActive = false;
  this.accountDeleted = true;
  this.deletedAt = new Date();
  this.deletionReason = reason;
  await this.save();
};

// Reactivate account
userSchema.methods.reactivate = async function() {
  this.isActive = true;
  this.accountDeleted = false;
  this.deletedAt = null;
  this.deletionReason = null;
  await this.save();
};

// ============ STATIC METHODS ============

// Find by email verification token
userSchema.statics.findByEmailVerificationToken = async function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
};

// Find by password reset token
userSchema.statics.findByPasswordResetToken = async function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
};

module.exports = mongoose.model('User', userSchema);