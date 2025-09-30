import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSimpleAuth } from '../contexts/SimpleAuthContext';
import SimpleLoginForm from './SimpleLoginForm';
import SimpleAdminPanel from './SimpleAdminPanel';

const SimpleAuth: React.FC = () => {
  const { user, loading, isAdmin } = useSimpleAuth();
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect after successful login
  useEffect(() => {
    if (user && !loading) {
      if (isAdmin()) {
        // Admin users stay on admin panel
        if (location.pathname !== '/admin') {
          navigate('/admin');
        }
      } else {
        // Regular users go to main app
        if (location.pathname === '/login' || location.pathname === '/admin') {
          navigate('/');
        }
      }
    }
  }, [user, loading, isAdmin, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-accent-purple to-accent-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <div className="text-text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  // If user is logged in and is admin, show admin panel
  if (user && isAdmin() && location.pathname === '/admin') {
    return <SimpleAdminPanel />;
  }

  // If user is logged in but not admin, redirect to main app
  if (user && !isAdmin()) {
    // This will be handled by the redirect logic above
    return null;
  }

  // Show login/register form
  return (
    <SimpleLoginForm 
      isLogin={isLogin} 
      onToggleMode={() => setIsLogin(!isLogin)} 
    />
  );
};

export default SimpleAuth;
