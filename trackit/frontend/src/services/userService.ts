import api from './api';
import { User, ApiResponse } from '../types';

export const userService = {
  getProfile: async () => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },
  
  updateProfile: async (data: Partial<User>) => {
    const response = await api.put<ApiResponse<User>>('/users/profile', data);
    return response.data;
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post<ApiResponse<null>>('/users/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
  
  updatePreferences: async (preferences: User['preferences']) => {
    const response = await api.put<ApiResponse<User>>('/users/preferences', { preferences });
    return response.data;
  },
  
  deleteAccount: async (password: string) => {
    const response = await api.delete<ApiResponse<null>>('/users/account', {
      data: { password },
    });
    return response.data;
  },
  
  setup2FA: async () => {
    const response = await api.post<ApiResponse<{ qrCode: string; secret: string; backupCodes: string[] }>>('/auth/2fa/setup');
    return response.data;
  },
  
  verify2FA: async (code: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/2fa/verify', { code });
    return response.data;
  },
  
  disable2FA: async (code: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/2fa/disable', { code });
    return response.data;
  },
};