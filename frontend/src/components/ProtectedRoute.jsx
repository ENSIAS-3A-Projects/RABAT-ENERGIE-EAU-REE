import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute component that redirects to login if user is not authenticated
 */
function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <p className="text-sm text-slate-400">Initialisation de l&apos;application...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && user?.role !== 'SUPERADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;


