import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Debug: Log user state changes
  useEffect(() => {
    console.log('AuthContext: User state changed:', user);
  }, [user]);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Simulate API call - replace with actual authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user exists in localStorage
      const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      console.log('🔍 Checking login for username:', username);
      console.log('📋 All registered users:', existingUsers);
      const existingUser = existingUsers.find((u: User) => u.username === username);
      console.log('👤 Found user:', existingUser);
      
      if (existingUser) {
        // Check user status
        if (existingUser.status === 'rejected') {
          return { success: false, message: 'Your account has been rejected. Please contact an administrator.' };
        }
        
        if (existingUser.status === 'pending') {
          return { success: false, message: 'Your account is pending approval. Please wait for an administrator to approve your access.' };
        }
        
        if (existingUser.status === 'approved' || existingUser.hasPermission) {
          // User has permission, log them in
          setUser(existingUser);
          localStorage.setItem('user', JSON.stringify(existingUser));
          return { success: true };
        } else {
          return { success: false, message: 'You do not have permission to access this website. Please contact an administrator.' };
        }
      } else {
        // User doesn't exist
        return { success: false, message: 'Invalid username or password.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Simulate API call - replace with actual registration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user already exists
      const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const existingUser = existingUsers.find((u: User) => u.username === username);
      
      if (existingUser) {
        // User already exists
        return { success: false, message: 'An account with this username already exists.' };
      }
      
      const newUser: User = {
        id: Date.now().toString(),
        username,
        email,
        createdAt: new Date(),
        hasPermission: false, // New users need admin approval
        status: 'pending', // Set status to pending
      };
      
      // Save to registered users
      const updatedUsers = [...existingUsers, newUser];
      localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
      
      console.log('✅ User registered successfully:', newUser);
      console.log('📝 All registered users:', updatedUsers);
      
      // Don't log them in automatically - they need approval
      return { 
        success: true, 
        message: 'Registration successful! Your account is pending approval. You will be notified once an administrator approves your access.' 
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateAzureKey = async (key: string): Promise<boolean> => {
    try {
      if (!user) {
        console.error('AuthContext: updateAzureKey: No user logged in');
        return false;
      }
      
      console.log('AuthContext: updateAzureKey: Updating key for user:', user.id);
      console.log('AuthContext: updateAzureKey: New key:', key);
      
      const updatedUser = { ...user, azureApiKey: key };
      console.log('AuthContext: updateAzureKey: updatedUser before setUser:', updatedUser);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Also update in registeredUsers array
      const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const updatedUsers = existingUsers.map((u: User) => 
        u.id === user.id ? { ...u, azureApiKey: key } : u
      );
      localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
      
      console.log('AuthContext: updateAzureKey: User updated in state, localStorage, and registeredUsers');
      console.log('AuthContext: updateAzureKey: Current user state after setUser:', user);
      
      // Clear voice cache when API key changes
      if (key && key !== user.azureApiKey) {
        const { CacheService, CACHE_KEYS } = await import('../services/cache');
        const cache = CacheService.getInstance();
        const oldCacheKey = user.azureApiKey ? `${CACHE_KEYS.AZURE_VOICES}_${user.azureApiKey.substring(0, 8)}_${user.azureRegion || 'eastus'}` : null;
        if (oldCacheKey) {
          cache.clear(oldCacheKey);
          console.log('AuthContext: updateAzureKey: Cleared old cache key:', oldCacheKey);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Update Azure key error:', error);
      return false;
    }
  };

  const updateAzureRegion = async (region: string): Promise<boolean> => {
    try {
      if (!user) return false;
      
      const updatedUser = { ...user, azureRegion: region };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Also update in registeredUsers array
      const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const updatedUsers = existingUsers.map((u: User) => 
        u.id === user.id ? { ...u, azureRegion: region } : u
      );
      localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
      
      // Clear voice cache when region changes
      if (region && region !== user.azureRegion) {
        const { CacheService, CACHE_KEYS } = await import('../services/cache');
        const cache = CacheService.getInstance();
        const oldCacheKey = user.azureApiKey ? `${CACHE_KEYS.AZURE_VOICES}_${user.azureApiKey.substring(0, 8)}_${user.azureRegion || 'eastus'}` : null;
        if (oldCacheKey) {
          cache.clear(oldCacheKey);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Update Azure region error:', error);
      return false;
    }
  };


  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    updateAzureKey,
    updateAzureRegion,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
