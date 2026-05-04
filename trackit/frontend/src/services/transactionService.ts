import api from './api';
import { Transaction, ApiResponse, PaginatedResponse } from '../types';

export const transactionService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    category?: string;
    type?: 'income' | 'expense';
    search?: string;
  }) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Transaction>>>('/transactions', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Transaction>>(`/transactions/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<Transaction>) => {
    const response = await api.post<ApiResponse<Transaction>>('/transactions', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Transaction>) => {
    const response = await api.put<ApiResponse<Transaction>>(`/transactions/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/transactions/${id}`);
    return response.data;
  },
  
  bulkDelete: async (ids: string[]) => {
    const response = await api.post<ApiResponse<null>>('/transactions/bulk-delete', { transactionIds: ids });
    return response.data;
  },
  
  getSummary: async (year?: number, month?: number) => {
    const response = await api.get<ApiResponse<any>>('/transactions/summary', {
      params: { year, month },
    });
    return response.data;
  },
};