export interface User {
  _id: string;
  name: string;
  email: string;
  currency: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  avatar?: string | null;  // ← FIXED: Allow null
  phoneNumber?: string;
  dateOfBirth?: string;
  occupation?: string;
  monthlyIncome?: number;
  financialGoal?: string;
  preferences: {
    emailNotifications: boolean;
    budgetAlerts: boolean;
    weeklyReport: boolean;
    marketingEmails: boolean;
    loginAlerts: boolean;
  };
}

export interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  date: string;
  notes?: string;
  tags?: string[];
  paymentMethod?: string;
  receipt?: {
    url: string;
    publicId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  _id: string;
  category: string;
  amount: number;
  spent: number;
  percentage: number;
  remaining: number;
  isOverBudget: boolean;
  alertThreshold: number;
  shouldAlert: boolean;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
  timestamp?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  transactions: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}