/**
 * Password Reset Component
 * 
 * Handles password reset flow - request reset and confirm reset with token
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface PasswordResetProps {
  onSwitchToLogin: () => void;
  resetToken?: string; // If provided, show reset form instead of request form
}

export const PasswordReset: React.FC<PasswordResetProps> = ({ onSwitchToLogin, resetToken }) => {
  const { resetPassword, confirmResetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isResetForm = !!resetToken;

  const validatePassword = (): string | null => {
    if (newPassword.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (!/(?=.*[a-z])/.test(newPassword)) {
      return 'Password must contain at least one lowercase letter';
    }

    if (!/(?=.*[A-Z])/.test(newPassword)) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!/(?=.*\d)/.test(newPassword)) {
      return 'Password must contain at least one number';
    }

    if (newPassword !== confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setSuccess(result.message || 'Password reset instructions sent to your email.');
        setEmail('');
      } else {
        setError(result.message || 'Failed to send reset instructions.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await confirmResetPassword(resetToken!, newPassword);
      
      if (result.success) {
        setSuccess(result.message || 'Password reset successfully. You can now sign in with your new password.');
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          onSwitchToLogin();
        }, 3000);
      } else {
        setError(result.message || 'Failed to reset password.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <span className="text-white font-bold text-xl">FS</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isResetForm ? 'Reset your password' : 'Forgot your password?'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isResetForm ? (
              'Enter your new password below'
            ) : (
              <>
                Remember your password?{' '}
                <button
                  onClick={onSwitchToLogin}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in here
                </button>
              </>
            )}
          </p>
        </div>

        {!isResetForm ? (
          // Request Reset Form
          <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{success}</div>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending instructions...
                  </div>
                ) : (
                  'Send reset instructions'
                )}
              </button>

              <button
                type="button"
                onClick={onSwitchToLogin}
                className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to sign in
              </button>
            </div>
          </form>
        ) : (
          // Confirm Reset Form
          <form className="mt-8 space-y-6" onSubmit={handleConfirmReset}>
            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="sr-only">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="appearance-none relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="appearance-none relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">
                  {success}
                  <br />
                  <span className="text-xs">Redirecting to login in 3 seconds...</span>
                </div>
              </div>
            )}

            {/* Password Requirements */}
            <div className="text-sm text-gray-600">
              <p className="mb-1">Password must contain:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                  At least 8 characters
                </li>
                <li className={/(?=.*[a-z])/.test(newPassword) ? 'text-green-600' : ''}>
                  One lowercase letter
                </li>
                <li className={/(?=.*[A-Z])/.test(newPassword) ? 'text-green-600' : ''}>
                  One uppercase letter
                </li>
                <li className={/(?=.*\d)/.test(newPassword) ? 'text-green-600' : ''}>
                  One number
                </li>
                <li className={newPassword === confirmPassword && newPassword ? 'text-green-600' : ''}>
                  Passwords match
                </li>
              </ul>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Resetting password...
                  </div>
                ) : (
                  'Reset password'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};