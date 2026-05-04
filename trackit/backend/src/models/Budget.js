const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Bills & Utilities',
      'Entertainment',
      'Healthcare',
      'Education',
      'Investment',
      'Travel',
      'Insurance',
      'Other'
    ]
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0,
    max: 99999999.99
  },
  
  spent: {
    type: Number,
    default: 0
  },
  
  period: {
    type: String,
    enum: ['monthly', 'weekly', 'yearly', 'custom'],
    default: 'monthly'
  },
  
  year: {
    type: Number,
    required: true,
    index: true
  },
  
  month: {
    type: Number,
    index: true
  },
  
  startDate: Date,
  endDate: Date,
  
  // Alert thresholds
  alertThreshold: {
    type: Number,
    default: 80,
    min: 0,
    max: 100
  },
  
  isAlertSent: {
    type: Boolean,
    default: false
  },
  
  // Rollover (unused budget carries to next month)
  rollover: {
    type: Boolean,
    default: false
  },
  
  rolloverAmount: {
    type: Number,
    default: 0
  },
  
  // Notes
  notes: String,
  
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

// Compound index for unique budget per user/category/period
budgetSchema.index({ user: 1, category: 1, year: 1, month: 1 }, { unique: true });

// Calculate percentage used
budgetSchema.virtual('percentageUsed').get(function() {
  if (this.amount === 0) return 0;
  return Math.min((this.spent / this.amount) * 100, 100);
});

// Check if over budget
budgetSchema.virtual('isOverBudget').get(function() {
  return this.spent > this.amount;
});

// Check if should send alert
budgetSchema.virtual('shouldSendAlert').get(function() {
  return !this.isAlertSent && this.percentageUsed >= this.alertThreshold;
});

// Method to update spent amount
budgetSchema.methods.updateSpent = async function() {
  const Transaction = require('./Transaction');
  
  const startDate = new Date(this.year, this.month - 1, 1);
  const endDate = new Date(this.year, this.month, 0, 23, 59, 59);
  
  const result = await Transaction.aggregate([
    {
      $match: {
        user: this.user,
        category: this.category,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  this.spent = result.length > 0 ? result[0].total : 0;
  await this.save();
};

module.exports = mongoose.model('Budget', budgetSchema);