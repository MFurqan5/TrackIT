const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { sendSuccess, sendError } = require('../utils/response');

// ============ CREATE TRANSACTION ============
const createTransaction = async (req, res) => {
  try {
    const {
      description,
      amount,
      type,
      category,
      subcategory,
      date,
      notes,
      tags,
      paymentMethod,
      location,
      currency
    } = req.body;

    // Validation
    if (!description || !amount || !type || !category) {
      return sendError(res, 'Please provide all required fields', 400);
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      description,
      amount,
      type,
      category,
      subcategory: subcategory || null,
      date: date || new Date(),
      notes: notes || '',
      tags: tags || [],
      paymentMethod: paymentMethod || 'other',
      location: location || null,
      currency: currency || req.user.currency || 'USD'
    });

    // Check budget alert (only for expenses)
    let budgetAlert = null;
    if (type === 'expense') {
      const currentYear = new Date(date || Date.now()).getFullYear();
      const currentMonth = new Date(date || Date.now()).getMonth() + 1;
      
      const budget = await Budget.findOne({
        user: req.user._id,
        category,
        year: currentYear,
        month: currentMonth
      });

      if (budget) {
        await budget.updateSpent();
        
        if (budget.shouldSendAlert) {
          budget.isAlertSent = true;
          await budget.save();
          
          budgetAlert = {
            category: budget.category,
            spent: budget.spent,
            limit: budget.amount,
            percentage: budget.percentageUsed,
            message: `You've used ${budget.percentageUsed.toFixed(0)}% of your ${category} budget`
          };
        }
      }
    }

    sendSuccess(res, { transaction, alert: budgetAlert }, 'Transaction created successfully', 201);
    
  } catch (error) {
    console.error('Create transaction error:', error);
    sendError(res, 'Failed to create transaction', 500, error);
  }
};

// ============ GET ALL TRANSACTIONS ============
const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      category,
      type,
      minAmount,
      maxAmount,
      search,
      sortBy = '-date'
    } = req.query;

    const query = { user: req.user._id, isDeleted: false };

    // Apply filters
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (category) query.category = category;
    if (type) query.type = type;
    
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { date: -1 },
      populate: []
    };

    const transactions = await Transaction.paginate(query, options);

    sendSuccess(res, {
      transactions: transactions.docs,
      total: transactions.totalDocs,
      page: transactions.page,
      totalPages: transactions.totalPages,
      hasNextPage: transactions.hasNextPage,
      hasPrevPage: transactions.hasPrevPage
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    sendError(res, 'Failed to get transactions', 500, error);
  }
};

// ============ GET SINGLE TRANSACTION ============
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!transaction) {
      return sendError(res, 'Transaction not found', 404);
    }

    sendSuccess(res, transaction);
    
  } catch (error) {
    console.error('Get transaction error:', error);
    sendError(res, 'Failed to get transaction', 500, error);
  }
};

// ============ UPDATE TRANSACTION ============
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Prevent updating protected fields
    delete updates._id;
    delete updates.user;
    delete updates.createdAt;
    delete updates.isDeleted;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, user: req.user._id, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return sendError(res, 'Transaction not found', 404);
    }

    // Update budget if amount or category changed
    if (updates.amount || updates.category) {
      const currentYear = new Date(transaction.date).getFullYear();
      const currentMonth = new Date(transaction.date).getMonth() + 1;
      
      const budget = await Budget.findOne({
        user: req.user._id,
        category: transaction.category,
        year: currentYear,
        month: currentMonth
      });
      
      if (budget) {
        await budget.updateSpent();
      }
    }

    sendSuccess(res, transaction, 'Transaction updated successfully');
    
  } catch (error) {
    console.error('Update transaction error:', error);
    sendError(res, 'Failed to update transaction', 500, error);
  }
};

// ============ DELETE TRANSACTION ============
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!transaction) {
      return sendError(res, 'Transaction not found', 404);
    }

    // Update budget
    const currentYear = new Date(transaction.date).getFullYear();
    const currentMonth = new Date(transaction.date).getMonth() + 1;
    
    const budget = await Budget.findOne({
      user: req.user._id,
      category: transaction.category,
      year: currentYear,
      month: currentMonth
    });
    
    if (budget) {
      await budget.updateSpent();
    }

    sendSuccess(res, null, 'Transaction deleted successfully');
    
  } catch (error) {
    console.error('Delete transaction error:', error);
    sendError(res, 'Failed to delete transaction', 500, error);
  }
};

// ============ BULK DELETE TRANSACTIONS ============
const bulkDeleteTransactions = async (req, res) => {
  try {
    const { transactionIds } = req.body;
    
    if (!transactionIds || !transactionIds.length) {
      return sendError(res, 'No transaction IDs provided', 400);
    }

    await Transaction.updateMany(
      { _id: { $in: transactionIds }, user: req.user._id },
      { isDeleted: true, deletedAt: new Date() }
    );

    sendSuccess(res, null, `${transactionIds.length} transactions deleted successfully`);
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    sendError(res, 'Failed to delete transactions', 500, error);
  }
};

// ============ GET TRANSACTION SUMMARY ============
const getTransactionSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const summary = await Transaction.getMonthlySummary(req.user._id, currentYear, currentMonth);
    const categoryBreakdown = await Transaction.getCategoryBreakdown(req.user._id, currentYear, currentMonth);
    const dailyTrend = await Transaction.getDailyTrend(req.user._id, currentYear, currentMonth);

    sendSuccess(res, {
      summary: {
        income: summary.income,
        expense: summary.expense,
        balance: summary.income - summary.expense
      },
      categoryBreakdown,
      dailyTrend,
      period: {
        year: currentYear,
        month: currentMonth
      }
    });
    
  } catch (error) {
    console.error('Transaction summary error:', error);
    sendError(res, 'Failed to get transaction summary', 500, error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  getTransactionSummary
};