import React from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import AdminAuthService from '../../services/adminAuth';
import AdminSystem from './AdminSystem';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback = <AdminSystem /> 
}) => {
  const adminAuth = AdminAuthService.getInstance();

  // Check if user can access the website
  const hasAccess = adminAuth.canAccessWebsite();

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
