import api from './api';
import { Budget, ApiResponse } from '../types';

export const budgetService = {
  getAll: async (year?: number, month?: number) => {
    const response = await api.get<ApiResponse<Budget[]>>('/budgets', {
      params: { year, month },
    });
    return response.data;
  },
  
  create: async (category: string, amount: number, year?: number, month?: number) => {
    const response = await api.post<ApiResponse<Budget>>('/budgets', {
      category,
      amount,
      year,
      month,
    });
    return response.data;
  },
  
  update: async (id: string, amount: number, alertThreshold?: number) => {
    const response = await api.put<ApiResponse<Budget>>(`/budgets/${id}`, {
      amount,
      alertThreshold,
    });
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/budgets/${id}`);
    return response.data;
  },
  
  getAlerts: async () => {
    const response = await api.get<ApiResponse<Budget[]>>('/budgets/alerts');
    return response.data;
  },
};