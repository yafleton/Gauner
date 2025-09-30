import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AdminAuthService from '../services/adminAuth';
import { AdminUser, AdminConfig, AdminContextType } from '../types/admin';

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [config, setConfig] = useState<AdminConfig>({});

  const adminAuth = AdminAuthService.getInstance();

  useEffect(() => {
    // Check if user is already authenticated
    const currentUser = adminAuth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsAdmin(adminAuth.isAdmin());
      setConfig(adminAuth.getConfig());
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const success = await adminAuth.login(username, password);
    if (success) {
      const currentUser = adminAuth.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsAdmin(adminAuth.isAdmin());
      setConfig(adminAuth.getConfig());
    }
    return success;
  };

  const logout = (): void => {
    adminAuth.logout();
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setConfig({});
  };

  const grantPermission = async (userId: string, permission: string): Promise<boolean> => {
    return await adminAuth.grantPermission(userId, permission);
  };

  const revokePermission = async (userId: string, permission: string): Promise<boolean> => {
    return await adminAuth.revokePermission(userId, permission);
  };

  const getUsers = async (): Promise<AdminUser[]> => {
    return await adminAuth.getAllUsers();
  };

  const createUser = async (username: string, password: string, role: 'admin' | 'user' = 'user'): Promise<boolean> => {
    return await adminAuth.createUser(username, password, role);
  };

  const updateConfig = async (newConfig: Partial<AdminConfig>): Promise<boolean> => {
    const success = await adminAuth.updateConfig(newConfig);
    if (success) {
      setConfig(adminAuth.getConfig());
    }
    return success;
  };

  const getConfig = (): AdminConfig => {
    return adminAuth.getConfig();
  };

  const value: AdminContextType = {
    isAdmin,
    isAuthenticated,
    user,
    login,
    logout,
    grantPermission,
    revokePermission,
    getUsers,
    createUser,
    updateConfig,
    getConfig
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
