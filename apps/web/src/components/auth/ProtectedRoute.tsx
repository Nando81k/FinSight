/**
 * Protected Route Component
 * 
 * Wrapper component that protects routes and redirects unauthenticated users
 */

import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from './AuthModal';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback,
  requireAuth = true 
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-600 mb-6">
            <span className="text-white font-bold text-2xl">FS</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to FinSight
          </h2>
          
          <p className="text-gray-600 mb-8">
            Please sign in to access your financial dashboard and tools.
          </p>

          <AuthModal 
            isOpen={true} 
            onClose={() => {}} // Don't allow closing when auth is required
            initialMode="login"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};