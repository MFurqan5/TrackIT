import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refetchUser: () => Promise<void>;  // ✅ Returns Promise<void>, not User
  updateUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromStorage = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('📦 Loaded user from storage:', parsedUser);
        setUser(parsedUser);
        return parsedUser;
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    return null;
  };

  const syncUserToStorage = (userData: User | null) => {
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    console.log('🔍 Checking auth, token exists:', !!token);
    
    if (token) {
      try {
        const response = await authService.getMe();
        console.log('✅ Auth loaded from API:', response.data);
        setUser(response.data);
        syncUserToStorage(response.data);
      } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        loadUserFromStorage();
      }
    } else {
      loadUserFromStorage();
    }
    setIsLoading(false);
  };

  // ✅ FIXED: Returns Promise<void>, not Promise<User>
  const refetchUser = async () => {
    try {
      const response = await authService.getMe();
      console.log('🔄 Refetched user:', response.data);
      setUser(response.data);
      syncUserToStorage(response.data);
    } catch (error) {
      console.error('Refetch error:', error);
    }
  };

  const updateUser = (updatedUser: User) => {
    console.log('📝 Updating user:', updatedUser);
    setUser(updatedUser);
    syncUserToStorage(updatedUser);
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
    syncUserToStorage(user);
    
    // 🚀 Fetch the full user profile immediately after logging in
    // This ensures avatar, phoneNumber, occupation, etc., are loaded right away.
    await refetchUser();
  };

  const register = async (name: string, email: string, password: string) => {
    await authService.register(name, email, password);
    toast.success('Registration successful! Please check your email to verify.');
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