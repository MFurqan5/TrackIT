import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, logout, refetchUser, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSetup2FA, setIsSetup2FA] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    occupation: 'Other',
    monthlyIncome: '',
    financialGoal: 'Save Money',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [twoFACode, setTwoFACode] = useState('');

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        occupation: user.occupation || 'Other',
        monthlyIncome: user.monthlyIncome?.toString() || '',
        financialGoal: user.financialGoal || 'Save Money',
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => userService.updateProfile(data),
    onSuccess: async () => {
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      userService.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  // Setup 2FA mutation
  const setup2FAMutation = useMutation({
    mutationFn: () => userService.setup2FA(),
    onSuccess: (data: any) => {
      setQrCode(data.data?.qrCode || data.qrCode);
      setBackupCodes(data.data?.backupCodes || data.backupCodes || []);
      setIsSetup2FA(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to setup 2FA');
    },
  });

  // Verify 2FA mutation
  const verify2FAMutation = useMutation({
    mutationFn: (code: string) => userService.verify2FA(code),
    onSuccess: async () => {
      setIsSetup2FA(false);
      setQrCode('');
      setBackupCodes([]);
      setTwoFACode('');
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('2FA enabled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Invalid 2FA code');
    },
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: (code: string) => userService.disable2FA(code),
    onSuccess: async () => {
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('2FA disabled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    },
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file); // Make sure 'avatar' matches your backend's expected field name

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/users/avatar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Server error during upload');
        }
        return await response.json();
      } catch (error: any) {
        if (error.message === 'Failed to fetch') {
          throw new Error('Connection lost! Your backend server likely crashed. Check your Node.js terminal.');
        }
        throw error;
      }
    },
    onSuccess: async (response) => {
      const uploadedAvatar = response?.data?.avatar;

      if (uploadedAvatar && user) {
        updateUser({ ...user, avatar: uploadedAvatar });
        setAvatarPreview(uploadedAvatar);
      }

      await refetchUser();
      toast.success('Profile picture updated!');
      setAvatarFile(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload avatar');
      setAvatarPreview(user?.avatar || null); // Revert to original avatar on error
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => userService.removeAvatar(),
    onSuccess: async () => {
      if (user) {
        updateUser({ ...user, avatar: null });
      }

      setAvatarFile(null);
      setAvatarPreview(null);
      await refetchUser();
      toast.success('Profile picture removed!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove avatar');
    },
  });

  const handleSaveAvatar = () => {
    if (avatarFile) {
      uploadAvatarMutation.mutate(avatarFile);
    }
  };

  const handleRemoveAvatar = () => {
    if (avatarFile && !user?.avatar) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    removeAvatarMutation.mutate();
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: Record<string, any> = {};
    
    if (formData.name !== user?.name) updateData.name = formData.name;
    if (formData.phoneNumber !== user?.phoneNumber) updateData.phoneNumber = formData.phoneNumber;
    if (formData.occupation !== user?.occupation) updateData.occupation = formData.occupation;
    if (formData.financialGoal !== user?.financialGoal) updateData.financialGoal = formData.financialGoal;
    
    const monthlyIncomeNum = formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : undefined;
    if (monthlyIncomeNum !== user?.monthlyIncome) updateData.monthlyIncome = monthlyIncomeNum;
    
    if (Object.keys(updateData).length === 0) {
      toast('No changes to save');
      setIsEditing(false);
      return;
    }
    
    updateProfileMutation.mutate(updateData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleDisable2FA = () => {
    const code = prompt('Enter your 2FA code to disable:');
    if (code) {
      disable2FAMutation.mutate(code);
    }
  };

  if (!user) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

      {/* Avatar Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile Picture</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-primary-600 font-bold">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload" className="btn-secondary cursor-pointer inline-block mr-2">
              {avatarPreview ? 'Edit' : 'Upload'}
            </label>
            {avatarFile && (
              <button onClick={handleSaveAvatar} className="btn-primary mr-2" disabled={uploadAvatarMutation.isPending}>
                {uploadAvatarMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            )}
            {avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                className="btn-secondary text-red-600 hover:text-red-700 mr-2"
                disabled={removeAvatarMutation.isPending || uploadAvatarMutation.isPending}
              >
                {removeAvatarMutation.isPending ? 'Removing...' : 'Remove'}
              </button>
            )}
            <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Personal Information</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="input"
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Occupation</label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="input"
              >
                <option value="Student">Student</option>
                <option value="Employed">Employed</option>
                <option value="Self-Employed">Self-Employed</option>
                <option value="Business Owner">Business Owner</option>
                <option value="Retired">Retired</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Income</label>
              <input
                type="number"
                step="0.01"
                value={formData.monthlyIncome}
                onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Financial Goal</label>
              <select
                value={formData.financialGoal}
                onChange={(e) => setFormData({ ...formData, financialGoal: e.target.value })}
                className="input"
              >
                <option value="Save Money">Save Money</option>
                <option value="Pay Debt">Pay Debt</option>
                <option value="Invest">Invest</option>
                <option value="Retire Early">Retire Early</option>
                <option value="Buy House">Buy House</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1">Save Changes</button>
              <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{user.name || 'Not set'}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{user.phoneNumber || 'Not set'}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <p className="text-sm text-gray-500">Occupation</p>
              <p className="font-medium">{user.occupation || 'Not set'}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <p className="text-sm text-gray-500">Monthly Income</p>
              <p className="font-medium text-green-600">
                {user.monthlyIncome ? formatCurrency(user.monthlyIncome, user.currency) : 'Not set'}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-sm text-gray-500">Financial Goal</p>
              <p className="font-medium">{user.financialGoal || 'Not set'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Security</h2>
        
        {isChangingPassword ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1">Change Password</button>
              <button type="button" onClick={() => setIsChangingPassword(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setIsChangingPassword(true)} className="btn-secondary w-full mb-6">
            Change Password
          </button>
        )}

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Two-Factor Authentication (2FA)</h3>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            {user.twoFactorEnabled ? (
              <button onClick={handleDisable2FA} className="btn-secondary text-sm">Disable 2FA</button>
            ) : (
              <button onClick={() => setup2FAMutation.mutate()} className="btn-primary text-sm" disabled={setup2FAMutation.isPending}>
                {setup2FAMutation.isPending ? 'Setting up...' : 'Enable 2FA'}
              </button>
            )}
          </div>
          {isSetup2FA && qrCode && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm mb-3">Scan this QR code with Google Authenticator:</p>
              <img src={qrCode} alt="2FA QR Code" className="mb-3 mx-auto" style={{ maxWidth: '200px' }} />
              <p className="text-sm mb-2">Enter the 6-digit code from your app:</p>
              <input
                type="text"
                maxLength={6}
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                className="input mb-3"
                placeholder="000000"
              />
              <button
                onClick={() => verify2FAMutation.mutate(twoFACode)}
                className="btn-primary w-full"
                disabled={verify2FAMutation.isPending || twoFACode.length !== 6}
              >
                {verify2FAMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <p className="text-xs text-gray-500 mt-3">Save your backup codes: {backupCodes.join(', ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <button
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete your account?')) {
              const password = prompt('Enter your password to confirm:');
              if (password) {
                try {
                  await userService.deleteAccount(password);
                  toast.success('Account deleted');
                  await logout();
                } catch (err: any) {
                  toast.error(err.response?.data?.message || 'Failed to delete account');
                }
              }
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default Profile;
