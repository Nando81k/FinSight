/**
 * User Profile Component
 * 
 * Displays and allows editing of user profile information and settings
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  CheckIcon,
  XMarkIcon,
  PencilIcon 
} from '@heroicons/react/24/outline';

export const UserProfile: React.FC = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setIsSubmitting(true);

    try {
      const result = await updateProfile(profileForm);
      
      if (result.success) {
        setProfileSuccess(result.message || 'Profile updated successfully');
        setIsEditingProfile(false);
      } else {
        setProfileError(result.message || 'Failed to update profile');
      }
    } catch (error) {
      setProfileError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      if (result.success) {
        setPasswordSuccess(result.message || 'Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
      } else {
        setPasswordError(result.message || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelProfileEdit = () => {
    setProfileForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    });
    setIsEditingProfile(false);
    setProfileError('');
    setProfileSuccess('');
  };

  const cancelPasswordChange = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsChangingPassword(false);
    setPasswordError('');
    setPasswordSuccess('');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Profile Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserCircleIcon className="h-12 w-12 text-gray-400" />
            </div>
            <div className="ml-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400">
                Member since {new Date(user.createdAt).toLocaleDateString()}
                {user.lastLoginAt && (
                  <>
                    {' • '}
                    Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
            )}
          </div>
        </div>
        
        <div className="px-6 py-4">
          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              {profileError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{profileError}</div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelProfileEdit}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-900">{user.email}</span>
                {!user.emailVerified && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Unverified
                  </span>
                )}
              </div>
            </div>
          )}

          {profileSuccess && (
            <div className="mt-4 rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{profileSuccess}</div>
            </div>
          )}
        </div>
      </div>

      {/* Password Management */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Password</h2>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LockClosedIcon className="h-4 w-4 mr-1" />
                Change Password
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          {isChangingPassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              {passwordError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{passwordError}</div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelPasswordChange}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-600">
              Password last changed: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
            </p>
          )}

          {passwordSuccess && (
            <div className="mt-4 rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{passwordSuccess}</div>
            </div>
          )}
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Sign out of your FinSight account on this device.
              </p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};