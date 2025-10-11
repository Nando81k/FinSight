import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import HomePage from './pages/HomePage';
import Salary from './pages/Salary';
import { UserProfile } from './components/auth/UserProfile';

/**
 * Protected Routes Component
 * Only renders children if user is authenticated
 */
const ProtectedApp: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Show loading while checking authentication
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

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User is authenticated, show the main app
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/salary" element={<Salary />} />
        <Route path="/profile" element={<UserProfile />} />
        {/* Redirect auth page to home if already logged in */}
        <Route path="/auth" element={<Navigate to="/" replace />} />
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

/**
 * Main App Component
 * Handles routing between authentication and protected app
 */
export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public authentication route */}
          <Route path="/auth" element={<AuthPage />} />
          {/* All other routes require authentication */}
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}