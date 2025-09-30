// Admin system types

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string; // Will be hashed
  role: 'admin' | 'user';
  permissions: string[];
  createdAt: number;
  lastLogin?: string;
}

export interface UserPermission {
  id: string;
  userId: string;
  permission: string;
  grantedBy: string;
  grantedAt: string;
}

export interface AdminConfig {
  youtubeApiKey?: string;
  azureRegion?: string;
  maxUsers?: number;
  maintenanceMode?: boolean;
}

export interface AdminContextType {
  isAdmin: boolean;
  isAuthenticated: boolean;
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  grantPermission: (userId: string, permission: string) => Promise<boolean>;
  revokePermission: (userId: string, permission: string) => Promise<boolean>;
  getUsers: () => Promise<AdminUser[]>;
  createUser: (username: string, password: string, role?: 'admin' | 'user') => Promise<boolean>;
  updateConfig: (config: Partial<AdminConfig>) => Promise<boolean>;
  getConfig: () => AdminConfig;
}
