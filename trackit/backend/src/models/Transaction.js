const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongooseAggregatePaginate = require('mongoose-aggregate-paginate-v2');

const transactionSchema = new mongoose.Schema({
  // ============ BASIC INFO ============
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0.01,
    max: 99999999.99
  },
  
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense', 'transfer'],
    lowercase: true
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
      'Salary',
      'Business',
      'Gifts & Donations',
      'Travel',
      'Insurance',
      'Taxes',
      'Other'
    ]
  },
  
  subcategory: {
    type: String,
    default: null
  },
  
  // ============ DATE & TIME ============
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  year: { type: Number, index: true },
  month: { type: Number, index: true },
  day: { type: Number },
  week: { type: Number },
  
  // ============ LOCATION ============
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  
  placeName: String,
  
  // ============ RECEIPTS & ATTACHMENTS ============
  receipt: {
    url: String,
    publicId: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: Date
  },
  
  attachments: [{
    url: String,
    publicId: String,
    fileName: String,
    fileSize: Number,
    mimeType: String
  }],
  
  // ============ TAGS & NOTES ============
  tags: [{
    type: String,
    lowercase: true,
    trim: true,
    index: true
  }],
  
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  
  // ============ PAYMENT INFO ============
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'paypal', 'crypto', 'other'],
    default: 'other'
  },
  
  paymentReference: String,
  
  // ============ RECURRING ============
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringTransaction'
  },
  
  // ============ BUDGET TRACKING ============
  budgetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Budget'
  },
  
  // ============ CURRENCY ============
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']
  },
  
  originalAmount: Number,
  originalCurrency: String,
  exchangeRate: Number,
  
  // ============ TAX ============
  taxAmount: {
    type: Number,
    default: 0
  },
  
  taxRate: {
    type: Number,
    default: 0
  },
  
  // ============ FLAGS ============
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  isSplit: {
    type: Boolean,
    default: false
  },
  
  parentTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  splitTransactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  
  // ============ MERCHANT (for auto-categorization) ============
  merchantName: String,
  merchantId: String,
  
  // ============ METADATA ============
  ipAddress: String,
  deviceInfo: String,
  
  // ============ CUSTOM FIELDS (for user-defined categories) ============
  customFields: Map,
  
  // ============ SYNC STATUS ============
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'synced'
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============ INDEXES ============
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, tags: 1 });
transactionSchema.index({ user: 1, year: 1, month: 1 });
transactionSchema.index({ location: '2dsphere' });
transactionSchema.index({ isRecurring: 1 });
transactionSchema.index({ merchantName: 1 });

// ============ PRE-SAVE HOOKS ============
transactionSchema.pre('save', function(next) {
  // Extract year, month, day, week from date
  if (this.date) {
    this.year = this.date.getFullYear();
    this.month = this.date.getMonth() + 1;
    this.day = this.date.getDate();
    
    // Calculate week number
    const startOfYear = new Date(this.year, 0, 1);
    const days = Math.floor((this.date - startOfYear) / (24 * 60 * 60 * 1000));
    this.week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }
  
  next();
});

// ============ VIRTUALS ============
transactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

transactionSchema.virtual('isExpense').get(function() {
  return this.type === 'expense';
});

transactionSchema.virtual('isIncome').get(function() {
  return this.type === 'income';
});

// ============ METHODS ============

// Soft delete transaction
transactionSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  await this.save();
};

// Restore soft deleted transaction
transactionSchema.methods.restore = async function() {
  this.isDeleted = false;
  await this.save();
};

// Duplicate transaction (for recurring)
transactionSchema.methods.duplicate = async function(newDate) {
  const newTransaction = new this.constructor(this.toObject());
  newTransaction._id = undefined;
  newTransaction.date = newDate || new Date();
  newTransaction.isRecurring = false;
  newTransaction.createdAt = undefined;
  newTransaction.updatedAt = undefined;
  return await newTransaction.save();
};

// ============ STATIC METHODS ============

// Get monthly summary
transactionSchema.statics.getMonthlySummary = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const result = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  const summary = { income: 0, expense: 0 };
  result.forEach(item => {
    summary[item._id] = item.total;
  });
  
  return summary;
};

// Get category breakdown
transactionSchema.statics.getCategoryBreakdown = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
        type: 'expense',
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        average: { $avg: '$amount' }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);
};

// Get daily spending trend
transactionSchema.statics.getDailyTrend = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
        type: 'expense',
        isDeleted: false
      }
    },
    {
      $group: {
        _id: { $dayOfMonth: '$date' },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Search transactions
transactionSchema.statics.search = async function(userId, query, options = {}) {
  const searchConditions = {
    user: new mongoose.Types.ObjectId(userId),
    isDeleted: false,
    $or: [
      { description: { $regex: query, $options: 'i' } },
      { notes: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
      { merchantName: { $regex: query, $options: 'i' } }
    ]
  };
  
  return await this.paginate(searchConditions, options);
};

// Add plugins
transactionSchema.plugin(mongoosePaginate);
transactionSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('Transaction', transactionSchema);
