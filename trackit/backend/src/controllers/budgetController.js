const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError } = require('../utils/response');

// ============ GET ALL BUDGETS ============
const getBudgets = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const budgets = await Budget.find({
      user: req.user._id,
      year: currentYear,
      month: currentMonth,
      isActive: true
    });

    // Calculate spent amount for each budget
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const spentResult = await Transaction.aggregate([
          {
            $match: {
              user: req.user._id,
              category: budget.category,
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

        const spent = spentResult.length > 0 ? spentResult[0].total : 0;
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        return {
          _id: budget._id,
          category: budget.category,
          amount: budget.amount,
          spent: spent,
          remaining: budget.amount - spent,
          percentage: Math.min(percentage, 100),
          isOverBudget: spent > budget.amount,
          alertThreshold: budget.alertThreshold,
          shouldAlert: percentage >= (budget.alertThreshold || 80)
        };
      })
    );

    sendSuccess(res, budgetsWithSpending);
  } catch (error) {
    console.error('Get budgets error:', error);
    sendError(res, 'Failed to get budgets', 500, error);
  }
};

// ============ CREATE BUDGET ============
const createBudget = async (req, res) => {
  try {
    const { category, amount, year, month, alertThreshold } = req.body;

    if (!category || !amount) {
      return sendError(res, 'Category and amount are required', 400);
    }

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    // Check if budget already exists
    const existingBudget = await Budget.findOne({
      user: req.user._id,
      category,
      year: currentYear,
      month: currentMonth
    });

    if (existingBudget) {
      return sendError(res, 'Budget already exists for this category this month', 400);
    }

    const budget = await Budget.create({
      user: req.user._id,
      category,
      amount,
      year: currentYear,
      month: currentMonth,
      alertThreshold: alertThreshold || 80
    });

    sendSuccess(res, budget, 'Budget created successfully', 201);
  } catch (error) {
    console.error('Create budget error:', error);
    sendError(res, 'Failed to create budget', 500, error);
  }
};

// ============ UPDATE BUDGET ============
const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, alertThreshold } = req.body;

    const budget = await Budget.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { amount, alertThreshold },
      { new: true, runValidators: true }
    );

    if (!budget) {
      return sendError(res, 'Budget not found', 404);
    }

    sendSuccess(res, budget, 'Budget updated successfully');
  } catch (error) {
    console.error('Update budget error:', error);
    sendError(res, 'Failed to update budget', 500, error);
  }
};

// ============ DELETE BUDGET ============
const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOneAndDelete({
      _id: id,
      user: req.user._id
    });

    if (!budget) {
      return sendError(res, 'Budget not found', 404);
    }

    sendSuccess(res, null, 'Budget deleted successfully');
  } catch (error) {
    console.error('Delete budget error:', error);
    sendError(res, 'Failed to delete budget', 500, error);
  }
};

// ============ GET BUDGET ALERTS ============
const getBudgetAlerts = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const budgets = await Budget.find({
      user: req.user._id,
      year: currentYear,
      month: currentMonth,
      isActive: true
    });

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const alerts = [];

    for (const budget of budgets) {
      const spentResult = await Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            category: budget.category,
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

      const spent = spentResult.length > 0 ? spentResult[0].total : 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      if (percentage >= (budget.alertThreshold || 80)) {
        alerts.push({
          category: budget.category,
          budgeted: budget.amount,
          spent: spent,
          percentage: Math.min(percentage, 100),
          remaining: budget.amount - spent,
          threshold: budget.alertThreshold || 80
        });
      }
    }

    sendSuccess(res, alerts);
  } catch (error) {
    console.error('Get budget alerts error:', error);
    sendError(res, 'Failed to get budget alerts', 500, error);
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetAlerts
};