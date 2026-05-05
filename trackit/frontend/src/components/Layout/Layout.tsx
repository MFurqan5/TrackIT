import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  HomeIcon,
  CreditCardIcon,
  ChartBarIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Transactions', href: '/transactions', icon: CreditCardIcon },
  { name: 'Budgets', href: '/budgets', icon: ChartBarIcon },
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get avatar display (image or first letter)
  const getAvatarDisplay = () => {
    if (user?.avatar) {
      return (
        <img 
          src={user.avatar} 
          alt={user.name} 
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    return (
      <span className="text-primary-600 font-bold text-lg">
        {user?.name?.charAt(0).toUpperCase() || 'U'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-10">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-primary-600">TrackIt</h1>
            <p className="text-xs text-gray-500 mt-1">Expense Tracker</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 mt-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
          
          {/* User Profile & Logout - BOTTOM */}
          <div className="p-4 border-t mt-auto">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                {getAvatarDisplay()}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;