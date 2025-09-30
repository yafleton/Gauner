import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService, { User, LoginResult } from '../services/auth';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  register: (username: string, email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  loading: boolean;
  isAdmin: () => boolean;
  getAllUsers: () => User[];
  grantPermission: (userId: string) => boolean;
  revokePermission: (userId: string) => boolean;
  removeUser: (userId: string) => boolean;
  createUser: (username: string, email: string, password: string, role?: 'admin' | 'user') => boolean;
  updateAzureKey: (key: string) => Promise<boolean>;
  updateAzureRegion: (region: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const SimpleAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authService = AuthService.getInstance();

  useEffect(() => {
    // Load current user on app start
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, [authService]);

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const result = await authService.login(username, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const register = async (username: string, email: string, password: string): Promise<LoginResult> => {
    return await authService.register(username, email, password);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const isAdmin = () => {
    return authService.isAdmin();
  };

  const getAllUsers = () => {
    return authService.getAllUsers();
  };

  const grantPermission = (userId: string) => {
    const success = authService.grantPermission(userId);
    if (success) {
      // Refresh current user if it's the same user
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    }
    return success;
  };

  const revokePermission = (userId: string) => {
    const success = authService.revokePermission(userId);
    if (success) {
      // Refresh current user if it's the same user
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    }
    return success;
  };

  const removeUser = (userId: string) => {
    const success = authService.removeUser(userId);
    if (success) {
      // Refresh current user if it's the same user
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    }
    return success;
  };

  const createUser = (username: string, email: string, password: string, role: 'admin' | 'user' = 'user') => {
    return authService.createUser(username, email, password, role);
  };

  const updateAzureKey = async (key: string): Promise<boolean> => {
    const success = authService.updateAzureKey(key);
    if (success) {
      // Refresh current user
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    }
    return success;
  };

  const updateAzureRegion = async (region: string): Promise<boolean> => {
    const success = authService.updateAzureRegion(region);
    if (success) {
      // Refresh current user
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    }
    return success;
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    isAdmin,
    getAllUsers,
    grantPermission,
    revokePermission,
    removeUser,
    createUser,
    updateAzureKey,
    updateAzureRegion,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useSimpleAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};
