import api from './api';
import { AuthResponse, ApiResponse, User } from '../types';

export const authService = {
  register: async (name: string, email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },
  
  verifyEmail: async (token: string) => {
    const response = await api.get<ApiResponse<null>>(`/auth/verify-email/${token}`);
    return response.data;
  },
  
  resendVerification: async (email: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/resend-verification', { email });
    return response.data;
  },
  
  forgotPassword: async (email: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },
  
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post<ApiResponse<null>>('/auth/logout', { refreshToken });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },
  
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post<AuthResponse>('/auth/refresh-token', { refreshToken });
    return response.data;
  },
};