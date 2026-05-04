const cron = require('node-cron');
const RecurringTransaction = require('../models/RecurringTransaction');
const { sendEmailNotification } = require('../services/emailService');

// Run every hour to check for due recurring transactions
const processRecurringTransactions = async () => {
  console.log('🔄 Checking recurring transactions...');
  
  const now = new Date();
  const dueTransactions = await RecurringTransaction.find({
    isActive: true,
    nextOccurrence: { $lte: now },
    $or: [
      { endDate: { $gte: now } },
      { endDate: null }
    ]
  });
  
  for (const recurring of dueTransactions) {
    try {
      const transaction = recurring.generateNextTransaction();
      
      if (recurring.autoApprove) {
        // Auto-create transaction
        await transaction.save();
        console.log(`✅ Auto-created recurring transaction: ${recurring.template.description}`);
      } else {
        // Send notification for approval
        await sendEmailNotification(recurring.user, {
          subject: 'Recurring Transaction Awaiting Approval',
          message: `A recurring transaction "${recurring.template.description}" for $${recurring.template.amount} is due.`
        });
      }
      
      await recurring.recordOccurrence();
      
    } catch (error) {
      console.error(`Failed to process recurring transaction ${recurring._id}:`, error);
    }
  }
  
  console.log(`✅ Processed ${dueTransactions.length} recurring transactions`);
};

// Schedule job to run every hour
const startRecurringJob = () => {
  cron.schedule('0 * * * *', () => {
    processRecurringTransactions();
  });
  console.log('📅 Recurring transactions job scheduled (every hour)');
};

module.exports = { startRecurringJob, processRecurringTransactions };