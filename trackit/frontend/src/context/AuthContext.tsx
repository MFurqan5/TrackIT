import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
  updateUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on app start
  const loadUserFromStorage = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const response = await authService.getMe();
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    } else {
      loadUserFromStorage();
    }
    setIsLoading(false);
  };

  const refetchUser = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('Refetch error:', error);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  useEffect(() => {
    loadUserFromStorage();
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const { user, accessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authService.register(name, email, password);
    const { user, accessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = async () => {
    await authService.logout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, refetchUser, updateUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};