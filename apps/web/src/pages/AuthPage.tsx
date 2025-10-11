/**
 * Authentication Page
 * 
 * Dedicated login/register page with modern design
 * Replaces modal-based authentication for better UX
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  UserIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

type AuthMode = 'login' | 'register' | 'forgot-password';

export const AuthPage: React.FC = () => {
  const { login, register, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(loginData.email, loginData.password);
      
      if (result.success) {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        email: registerData.email,
        password: registerData.password
      });
      
      if (result.success) {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login('demo@finsight.com', 'demo123');
      
      if (result.success) {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('Demo login failed. Please try again.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 py-20">
          <div className="max-w-md">
            <div className="flex items-center mb-8">
              <CurrencyDollarIcon className="h-12 w-12 text-white mr-3" />
              <h1 className="text-4xl font-bold text-white">FinSight</h1>
            </div>
            
            <p className="text-xl text-blue-100 mb-12 leading-relaxed">
              Take control of your financial future with comprehensive planning tools and insights.
            </p>

            <div className="space-y-6">
              <div className="flex items-center text-blue-100">
                <ChartBarIcon className="h-8 w-8 mr-4 text-blue-200" />
                <div>
                  <h3 className="font-semibold text-white">Portfolio Management</h3>
                  <p className="text-sm">Track and analyze your investments</p>
                </div>
              </div>
              
              <div className="flex items-center text-blue-100">
                <PresentationChartLineIcon className="h-8 w-8 mr-4 text-blue-200" />
                <div>
                  <h3 className="font-semibold text-white">Tax Planning</h3>
                  <p className="text-sm">Optimize your tax strategy</p>
                </div>
              </div>
              
              <div className="flex items-center text-blue-100">
                <BanknotesIcon className="h-8 w-8 mr-4 text-blue-200" />
                <div>
                  <h3 className="font-semibold text-white">Budget & Retirement</h3>
                  <p className="text-sm">Plan for your financial goals</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Authentication Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-20 sm:px-12 lg:px-20">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <CurrencyDollarIcon className="h-10 w-10 text-blue-600 mr-2" />
              <h1 className="text-3xl font-bold text-gray-900">FinSight</h1>
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Reset password'}
            </h2>
            <p className="mt-2 text-gray-600">
              {mode === 'login' 
                ? 'Sign in to access your financial dashboard' 
                : mode === 'register'
                ? 'Join thousands managing their finances with FinSight'
                : 'Enter your email to reset your password'
              }
            </p>
          </div>

          {/* Demo Login Button */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full mb-6 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Try Demo Account'}
            </button>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            {mode === 'login' && (
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign in with your account</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    required
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Forgot your password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={registerData.firstName}
                      onChange={handleRegisterChange}
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="First name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={registerData.lastName}
                    onChange={handleRegisterChange}
                    required
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={registerData.email}
                    onChange={handleRegisterChange}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={registerData.password}
                    onChange={handleRegisterChange}
                    required
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={registerData.confirmPassword}
                    onChange={handleRegisterChange}
                    required
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          {/* Mode Switcher */}
          <div className="mt-8 text-center">
            {mode === 'login' ? (
              <p className="text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  Sign up
                </button>
              </p>
            ) : mode === 'register' ? (
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-gray-600">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};