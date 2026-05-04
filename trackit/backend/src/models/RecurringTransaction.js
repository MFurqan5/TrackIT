const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Original transaction template
  template: {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    subcategory: String,
    paymentMethod: String,
    notes: String,
    tags: [String]
  },
  
  // Recurring schedule
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'],
    required: true
  },
  
  interval: {
    type: Number,
    default: 1,
    min: 1,
    max: 365
  },
  
  // Custom days (for weekly on specific days)
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6
  }],
  
  // Custom dates (for monthly on specific dates)
  daysOfMonth: [{
    type: Number,
    min: 1,
    max: 31
  }],
  
  // Start and end dates
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endDate: Date,
  
  endAfterOccurrences: Number,
  
  // Next occurrence tracking
  nextOccurrence: {
    type: Date,
    required: true
  },
  
  lastOccurrence: Date,
  
  occurrenceCount: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  pauseUntil: Date,
  
  // Auto-approve or require confirmation
  autoApprove: {
    type: Boolean,
    default: true
  },
  
  // Notification settings
  notifyBeforeDays: {
    type: Number,
    default: 3
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

// Indexes
recurringTransactionSchema.index({ user: 1, isActive: 1 });
recurringTransactionSchema.index({ nextOccurrence: 1 });
recurringTransactionSchema.index({ startDate: 1, endDate: 1 });

// Calculate next occurrence date
recurringTransactionSchema.methods.calculateNextOccurrence = function(currentDate) {
  const date = currentDate || new Date();
  let nextDate = new Date(date);
  
  switch(this.frequency) {
    case 'daily':
      nextDate.setDate(date.getDate() + this.interval);
      break;
      
    case 'weekly':
      nextDate.setDate(date.getDate() + (7 * this.interval));
      break;
      
    case 'biweekly':
      nextDate.setDate(date.getDate() + 14);
      break;
      
    case 'monthly':
      nextDate.setMonth(date.getMonth() + this.interval);
      break;
      
    case 'quarterly':
      nextDate.setMonth(date.getMonth() + (3 * this.interval));
      break;
      
    case 'yearly':
      nextDate.setFullYear(date.getFullYear() + this.interval);
      break;
  }
  
  return nextDate;
};

// Generate next transaction from template
recurringTransactionSchema.methods.generateNextTransaction = function() {
  const Transaction = require('./Transaction');
  
  return new Transaction({
    user: this.user,
    description: this.template.description,
    amount: this.template.amount,
    type: this.template.type,
    category: this.template.category,
    subcategory: this.template.subcategory,
    paymentMethod: this.template.paymentMethod,
    notes: this.template.notes,
    tags: this.template.tags,
    date: this.nextOccurrence,
    isRecurring: true,
    recurringId: this._id
  });
};

// Update occurrence tracking
recurringTransactionSchema.methods.recordOccurrence = async function() {
  this.occurrenceCount += 1;
  this.lastOccurrence = this.nextOccurrence;
  this.nextOccurrence = this.calculateNextOccurrence(this.nextOccurrence);
  
  // Check if should end
  if (this.endAfterOccurrences && this.occurrenceCount >= this.endAfterOccurrences) {
    this.isActive = false;
  }
  
  if (this.endDate && this.nextOccurrence > this.endDate) {
    this.isActive = false;
  }
  
  await this.save();
};

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);