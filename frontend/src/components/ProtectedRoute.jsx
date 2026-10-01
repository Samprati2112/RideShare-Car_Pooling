import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Protected Route Wrapper
 *
 * INTERVIEW DESIGN DECISIONS:
 * - Route Guard: Intercepts navigation to private pages (/create-ride, /my-rides, /my-bookings).
 * - Location Preservation: Passes `location` inside `state.from` so that after logging in, the user
 *   is automatically redirected back to the exact page they were trying to access.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LoadingSpinner text="Checking authentication status..." size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
