const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { sendSuccess, sendError } = require('../utils/response');
const { startOfMonth, endOfMonth, subMonths, format } = require('date-fns');

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;
    
    const userId = req.user._id;
    
    // Current month summary
    const currentSummary = await Transaction.getMonthlySummary(userId, currentYear, currentMonth);
    
    // Previous month comparison
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const previousSummary = await Transaction.getMonthlySummary(userId, previousYear, previousMonth);
    
    // Calculate percentage changes
    const expenseChange = previousSummary.expense === 0 ? 0 :
      ((currentSummary.expense - previousSummary.expense) / previousSummary.expense) * 100;
    
    const incomeChange = previousSummary.income === 0 ? 0 :
      ((currentSummary.income - previousSummary.income) / previousSummary.income) * 100;
    
    // Category breakdown
    const categoryBreakdown = await Transaction.getCategoryBreakdown(userId, currentYear, currentMonth);
    
    // Daily trend
    const dailyTrend = await Transaction.getDailyTrend(userId, currentYear, currentMonth);
    
    // Top spending categories
    const topCategories = categoryBreakdown.slice(0, 5);
    
    // Budget status
    const budgets = await Budget.find({
      user: userId,
      year: currentYear,
      month: currentMonth,
      isActive: true
    });
    
    const budgetStatus = budgets.map(budget => ({
      category: budget.category,
      budgeted: budget.amount,
      spent: budget.spent,
      remaining: budget.amount - budget.spent,
      percentage: (budget.spent / budget.amount) * 100
    }));
    
    // Recent transactions (last 10)
    const recentTransactions = await Transaction.find({
      user: userId,
      isDeleted: false
    })
      .sort({ date: -1 })
      .limit(10);
    
    sendSuccess(res, {
      summary: {
        income: currentSummary.income,
        expense: currentSummary.expense,
        balance: currentSummary.income - currentSummary.expense,
        savingsRate: currentSummary.income === 0 ? 0 :
          ((currentSummary.income - currentSummary.expense) / currentSummary.income) * 100
      },
      comparisons: {
        expenseChange: expenseChange.toFixed(1),
        incomeChange: incomeChange.toFixed(1),
        previousMonth: {
          income: previousSummary.income,
          expense: previousSummary.expense
        }
      },
      charts: {
        categoryBreakdown,
        dailyTrend,
        topCategories
      },
      budgets: budgetStatus,
      recentTransactions,
      period: {
        year: currentYear,
        month: currentMonth
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    sendError(res, 'Failed to get dashboard data', 500, error);
  }
};

// Get spending trends over time
const getSpendingTrends = async (req, res) => {
  try {
    const { months = 6, category } = req.query;
    const userId = req.user._id;
    
    const monthsToGet = parseInt(months);
    const trends = [];
    
    for (let i = 0; i < monthsToGet; i++) {
      const date = subMonths(new Date(), i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const matchCondition = {
        user: userId,
        year,
        month,
        type: 'expense',
        isDeleted: false
      };
      
      if (category) {
        matchCondition.category = category;
      }
      
      const result = await Transaction.aggregate([
        { $match: matchCondition },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      trends.unshift({
        month: format(date, 'MMM yyyy'),
        year,
        monthNumber: month,
        amount: result.length > 0 ? result[0].total : 0
      });
    }
    
    sendSuccess(res, trends);
    
  } catch (error) {
    console.error('Trends error:', error);
    sendError(res, 'Failed to get spending trends', 500, error);
  }
};

// Get cash flow analysis
const getCashFlow = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;
    const userId = req.user._id;
    
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    // Daily cash flow
    const dailyCashFlow = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate, $lte: endDate },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.day',
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
            }
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Best and worst days
    const bestDay = dailyCashFlow.reduce((best, day) => {
      const net = day.income - day.expense;
      return net > best.net ? { day: day._id, net } : best;
    }, { net: -Infinity });
    
    const worstDay = dailyCashFlow.reduce((worst, day) => {
      const net = day.income - day.expense;
      return net < worst.net ? { day: day._id, net } : worst;
    }, { net: Infinity });
    
    sendSuccess(res, {
      dailyCashFlow,
      insights: {
        bestDay: bestDay.day ? { day: bestDay.day, netAmount: bestDay.net } : null,
        worstDay: worstDay.day ? { day: worstDay.day, netAmount: worstDay.net } : null,
        averageDailySpend: dailyCashFlow.reduce((sum, day) => sum + day.expense, 0) / dailyCashFlow.length
      }
    });
    
  } catch (error) {
    console.error('Cash flow error:', error);
    sendError(res, 'Failed to get cash flow', 500, error);
  }
};

module.exports = { getDashboardSummary, getSpendingTrends, getCashFlow };