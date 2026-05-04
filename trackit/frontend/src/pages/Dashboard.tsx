import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { budgetService } from '../services/budgetService';
import { formatCurrency } from '../utils/formatters';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Custom Tooltip Component - Simplified to avoid type issues
const CustomTooltip = ({ active, payload, label }: any) => {
  const { user } = useAuth();
  
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value, user?.currency)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch summary data
  const { data: summaryData } = useQuery({
    queryKey: ['summary', selectedYear, selectedMonth],
    queryFn: () => transactionService.getSummary(selectedYear, selectedMonth),
  });

  // Fetch budgets
  const { data: budgetData } = useQuery({
    queryKey: ['budgets', selectedYear, selectedMonth],
    queryFn: () => budgetService.getAll(selectedYear, selectedMonth),
  });

  // Fetch recent transactions
  const { data: recentTransactionsData } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: () => transactionService.getAll({ limit: 10 }),
  });

  // Extract data from responses
  const summary = summaryData?.data?.summary || summaryData?.data || { income: 0, expense: 0 };
  const income = summary.income || 0;
  const expense = summary.expense || 0;
  const balance = income - expense;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  // Extract budgets
  let budgets: any[] = [];
  if (budgetData?.data) {
    budgets = Array.isArray(budgetData.data) ? budgetData.data : [];
  } else if (Array.isArray(budgetData)) {
    budgets = budgetData;
  }

  // Extract recent transactions
  let recentTransactions: any[] = [];
  if (recentTransactionsData?.data?.transactions) {
    recentTransactions = recentTransactionsData.data.transactions;
  } else if (recentTransactionsData?.data && Array.isArray(recentTransactionsData.data)) {
    recentTransactions = recentTransactionsData.data;
  } else if (Array.isArray(recentTransactionsData)) {
    recentTransactions = recentTransactionsData;
  }

  // Prepare pie chart data
  const pieData = budgets
    .filter((b: any) => (b.spent || 0) > 0)
    .map((budget: any) => ({
      name: budget.category,
      value: budget.spent || 0,
    }));

  // Prepare bar chart data
  const barData = [...budgets]
    .sort((a, b) => (b.spent || 0) - (a.spent || 0))
    .slice(0, 5)
    .map((budget: any) => ({
      category: budget.category,
      spent: budget.spent || 0,
      budgeted: budget.amount || 0,
    }));

  // Custom label formatter for pie chart
  const renderPieLabel = (entry: any) => {
    const { name, percent } = entry;
    if (percent === undefined || percent === null) return name;
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}!</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex gap-4">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="input w-32"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
            <option key={month} value={month}>
              {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="input w-24"
        >
          {[2023, 2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Total Income</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(income, user?.currency)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(expense, user?.currency)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Net Balance</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balance, user?.currency)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Savings Rate</p>
          <p className="text-2xl font-bold text-primary-600">
            {savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderPieLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No spending data for this month</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Spending Categories</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="spent" fill="#EF4444" name="Spent" />
                <Bar dataKey="budgeted" fill="#4F46E5" name="Budgeted" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No budget data for this month</p>
          )}
        </div>
      </div>

      {/* Budget Progress */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold mb-4">Budget Progress</h3>
        {budgets.length > 0 ? (
          <div className="space-y-4">
            {budgets.slice(0, 5).map((budget: any) => (
              <div key={budget.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{budget.category}</span>
                  <span>
                    {formatCurrency(budget.spent || 0, user?.currency)} / {formatCurrency(budget.amount || 0, user?.currency)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (budget.percentage || 0) >= 90 ? 'bg-red-600' : 
                      (budget.percentage || 0) >= 70 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budget.percentage || 0, 100)}%` }}
                  />
                </div>
                {(budget.percentage || 0) >= 80 && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ You've used {Math.round(budget.percentage || 0)}% of your {budget.category} budget
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No budgets set. Go to Budgets page to set spending limits.
          </p>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <a href="/transactions" className="text-primary-600 text-sm hover:underline">
            View All →
          </a>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-500">Description</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-500">Category</th>
                  <th className="text-right py-3 text-sm font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction: any) => (
                  <tr key={transaction._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 text-sm">{new Date(transaction.date).toLocaleDateString()}</td>
                    <td className="py-3 text-sm">{transaction.description}</td>
                    <td className="py-3 text-sm">{transaction.category}</td>
                    <td className={`py-3 text-sm text-right font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, user?.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No transactions yet. Click "Add Transaction" to get started.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;