export interface User {
  _id: string;
  name: string;
  email: string;
  currency: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  avatar?: string;
}

export interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  notes?: string;
  tags?: string[];
  receipt?: {
    url: string;
    publicId: string;
  };
}

export interface Budget {
  _id: string;
  category: string;
  amount: number;
  spent: number;
  percentage: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}