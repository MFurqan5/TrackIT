import api from './api';
import { Transaction } from '../types';

export const transactionService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    category?: string;
    type?: 'income' | 'expense';
  }) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<Transaction>) => {
    const response = await api.post('/transactions', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Transaction>) => {
    const response = await api.put(`/transactions/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
  
  getSummary: async (year?: number, month?: number) => {
    const response = await api.get('/transactions/summary', {
      params: { year, month },
    });
    return response.data;
  },
};