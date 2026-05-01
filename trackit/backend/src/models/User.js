const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // BASIC INFO (Required)
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
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  
  // CONTACT (Optional)
  phoneNumber: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
    default: null
  },
  
  // PROFILE (Optional - for future avatar upload)
  avatar: {
    type: String,
    default: null
  },
  
  avatarPublicId: {
    type: String,
    default: null
  },
  
  dateOfBirth: {
    type: Date,
    default: null
  },
  
  occupation: {
    type: String,
    enum: ['Student', 'Employed', 'Self-Employed', 'Business Owner', 'Retired', 'Unemployed', 'Other'],
    default: 'Other'
  },
  
  // FINANCIAL PREFERENCES
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']
  },
  
  monthlyIncome: {
    type: Number,
    min: 0,
    default: 0
  },
  
  financialGoal: {
    type: String,
    enum: ['Save Money', 'Pay Debt', 'Invest', 'Retire Early', 'Buy House', 'Other'],
    default: 'Save Money'
  },
  
  // SECURITY
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  twoFactorSecret: String,
  
  // SESSION MANAGEMENT
  lastLogin: {
    type: Date,
    default: null
  },
  
  lastLoginIP: {
    type: String,
    default: null
  },
  
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ip: String,
    userAgent: String
  }],
  
  // NOTIFICATION PREFERENCES
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: false }
  },
  
  // ACCOUNT STATUS
  isActive: {
    type: Boolean,
    default: true
  },
  
  accountDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date,
    default: null
  },
  
  // SUBSCRIPTION
  subscriptionTier: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  
  subscriptionExpiresAt: {
    type: Date,
    default: null
  },
  
  // API USAGE TRACKING
  apiCallsToday: {
    type: Number,
    default: 0
  },
  
  lastApiReset: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true
});

// ============ MIDDLEWARE ============

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Reset API counter daily
userSchema.pre('save', function() {
  const now = new Date();
  const lastReset = this.lastApiReset;
  
  if (lastReset && now.getDate() !== lastReset.getDate()) {
    this.apiCallsToday = 0;
    this.lastApiReset = now;
  }
});

// ============ METHODS ============

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Increment API call counter
userSchema.methods.incrementApiCalls = async function() {
  this.apiCallsToday += 1;
  await this.save();
};

// Check if user can make API call
userSchema.methods.canMakeApiCall = function() {
  const limit = this.subscriptionTier === 'free' ? 100 : 10000;
  return this.apiCallsToday < limit;
};

// ============ INDEXES ============

userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ subscriptionTier: 1 });

module.exports = mongoose.model('User', userSchema);