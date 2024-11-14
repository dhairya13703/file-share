import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import PinLogin from './PinLogin';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const authTimestamp = localStorage.getItem('statsAuth');
    if (authTimestamp) {
      // Check if auth is still valid (24 hours)
      const isValid = Date.now() - parseInt(authTimestamp) < 24 * 60 * 60 * 1000;
      setIsAuthenticated(isValid);
      if (!isValid) {
        localStorage.removeItem('statsAuth');
      }
    }
    setIsLoading(false);
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PinLogin onSuccess={handleAuthSuccess} />;
  }

  return children;
};

export default ProtectedRoute;