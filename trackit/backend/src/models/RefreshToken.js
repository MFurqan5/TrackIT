const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  expiresAt: {
    type: Date,
    required: true
  },
  
  revoked: {
    type: Boolean,
    default: false
  },
  
  revokedAt: Date,
  revokedReason: String,
  
  deviceInfo: {
    deviceName: String,
    ip: String,
    userAgent: String
  },
  
  lastUsedAt: Date,
  usedCount: { type: Number, default: 0 }

}, { timestamps: true });

// Generate unique token
refreshTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(64).toString('hex');
};

// Check if token is expired
refreshTokenSchema.methods.isExpired = function() {
  return Date.now() >= this.expiresAt.getTime();
};

// Revoke token
refreshTokenSchema.methods.revoke = async function(reason = 'user_logout') {
  this.revoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  await this.save();
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);