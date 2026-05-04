import api from './api';

export const budgetService = {
  getAll: async (year?: number, month?: number) => {
    const response = await api.get('/budgets', { params: { year, month } });
    return response.data;
  },
  
  create: async (category: string, amount: number, month?: string) => {
    const response = await api.post('/budgets', { category, monthlyLimit: amount, month });
    return response.data;
  },
  
  update: async (id: string, amount: number) => {
    const response = await api.put(`/budgets/${id}`, { monthlyLimit: amount });
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  },
  
  getAlerts: async () => {
    const response = await api.get('/budgets/alerts');
    return response.data;
  },
};