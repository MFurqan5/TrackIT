import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const CATEGORIES = [
    'Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities',
    'Entertainment', 'Healthcare', 'Education', 'Investment', 'Salary',
    'Business', 'Gifts & Donations', 'Travel', 'Insurance', 'Taxes', 'Other'
];

interface Filters {
    type: string;
    category: string;
    startDate: string;
    endDate: string;
    search: string;
}

const Transactions: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<Filters>({
        type: '',
        category: '',
        startDate: '',
        endDate: '',
        search: '',
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<any>(null);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'expense',
        category: 'Food & Dining',
        date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    // Fetch transactions
    const { data, isLoading } = useQuery({
        queryKey: ['transactions', page, filters],
        queryFn: () => transactionService.getAll({
            page,
            limit: 10,
            type: filters.type as 'income' | 'expense' | undefined,
            category: filters.category || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            search: filters.search || undefined
        }),
    });

    const transactions = data?.data?.transactions || [];
    const totalPages = data?.data?.totalPages || 1;

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => transactionService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            setIsModalOpen(false);
            resetForm();
            toast.success('Transaction added successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add transaction');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => transactionService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            setIsModalOpen(false);
            setEditingTransaction(null);
            resetForm();
            toast.success('Transaction updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update transaction');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => transactionService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            toast.success('Transaction deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete transaction');
        },
    });

    const resetForm = () => {
        setFormData({
            description: '',
            amount: '',
            type: 'expense',
            category: 'Food & Dining',
            date: new Date().toISOString().split('T')[0],
            notes: '',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            ...formData,
            amount: parseFloat(formData.amount),
        };

        if (editingTransaction) {
            updateMutation.mutate({ id: editingTransaction._id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (transaction: any) => {
        setEditingTransaction(transaction);
        setFormData({
            description: transaction.description,
            amount: transaction.amount.toString(),
            type: transaction.type,
            category: transaction.category,
            date: transaction.date.split('T')[0],
            notes: transaction.notes || '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleFilterChange = (key: keyof Filters, value: string) => {
        setFilters({ ...filters, [key]: value });
        setPage(1);
    };

    return (
        <>
            <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                        <p className="text-gray-600">Manage all your income and expenses</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingTransaction(null);
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="btn-primary"
                    >
                        + Add Transaction
                    </button>
                </div>

                {/* Filters */}
                <div className="card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="input"
                    />
                    <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="input"
                    >
                        <option value="">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </select>
                    <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="input"
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        className="input"
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        className="input"
                        placeholder="End Date"
                    />
                </div>
            </div>

            {/* Transactions Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-3 text-sm font-medium text-gray-500">Date</th>
                                <th className="text-left py-3 text-sm font-medium text-gray-500">Description</th>
                                <th className="text-left py-3 text-sm font-medium text-gray-500">Category</th>
                                <th className="text-right py-3 text-sm font-medium text-gray-500">Amount</th>
                                <th className="text-center py-3 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8">Loading...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500">No transactions found</td>
                                </tr>
                            ) : (
                                transactions.map((transaction: any) => (
                                    <tr key={transaction._id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 text-sm">{formatDate(transaction.date)}</td>
                                        <td className="py-3 text-sm">{transaction.description}</td>
                                        <td className="py-3 text-sm">{transaction.category}</td>
                                        <td className={`py-3 text-sm text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'} `}>
                                            {transaction.type === 'income' ? '+' : '-'}
                                            {formatCurrency(transaction.amount, user?.currency)}
                                        </td>
                                        <td className="py-3 text-center">
                                            <button
                                                onClick={() => handleEdit(transaction)}
                                                className="text-blue-600 hover:text-blue-800 mr-3"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(transaction._id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-3 py-1">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>

      {/* Add/Edit Modal */ }
    {
        isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">
                        {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="input"
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="input"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="input"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="submit" className="btn-primary flex-1">
                                {editingTransaction ? 'Update' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingTransaction(null);
                                    resetForm();
                                }}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </>
  );
};

export default Transactions;