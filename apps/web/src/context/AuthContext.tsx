/**
 * Authentication Context
 * 
 * React context for managing user authentication state across the application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>) => Promise<{ success: boolean; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  confirmResetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use hardcoded API URL for now - in production this would come from environment variables
  const API_BASE = 'http://localhost:4000/api';

  // Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('finsight_token');
        
        if (storedToken) {
          // Verify token with server
          const response = await fetch(`${API_BASE}/auth/verify-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ token: storedToken }),
          });

          const data = await response.json();

          if (data.success && data.valid && data.user) {
            setToken(storedToken);
            setUser(data.user);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('finsight_token');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('finsight_token');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [API_BASE]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('finsight_token', data.token);
        
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.token && result.user) {
        setToken(result.token);
        setUser(result.user);
        localStorage.setItem('finsight_token', result.token);
        
        return { success: true };
      } else {
        return { success: false, message: result.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('finsight_token');
    
    // Optional: call logout endpoint to handle server-side cleanup
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }).catch(console.error);
    }
  };

  const updateProfile = async (profileData: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>): Promise<{ success: boolean; message?: string }> => {
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (result.success && result.user) {
        setUser(result.user);
        return { success: true, message: result.message };
      } else {
        return { success: false, message: result.message || 'Profile update failed' };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      return {
        success: result.success,
        message: result.message || (result.success ? 'Password changed successfully' : 'Password change failed')
      };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      return {
        success: result.success,
        message: result.message || 'Password reset instructions sent if account exists'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const confirmResetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
      });

      const result = await response.json();

      return {
        success: result.success,
        message: result.message || (result.success ? 'Password reset successfully' : 'Password reset failed')
      };
    } catch (error) {
      console.error('Confirm reset password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    resetPassword,
    confirmResetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};