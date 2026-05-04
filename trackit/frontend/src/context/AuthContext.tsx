import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refetchUser: () => Promise<User | undefined>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const response = await authService.getMe();
        console.log('CheckAuth - User data:', response.data); // Debug log
        setUser(response.data);
      } catch (error) {
        console.error('CheckAuth error:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
    setIsLoading(false);
  };

  const refetchUser = async () => {
    try {
      console.log('Refetching user data...'); // Debug log
      const response = await authService.getMe();
      console.log('Refetched user data:', response.data); // Debug log
      setUser(response.data); // This should update the UI
      return response.data;
    } catch (error) {
      console.error('Failed to refetch user:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const { user, accessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authService.register(name, email, password);
    const { user, accessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, refetchUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};