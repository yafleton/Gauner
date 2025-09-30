// Secure admin authentication service
import { AdminUser, AdminConfig, UserPermission } from '../types/admin';

class AdminAuthService {
  private static instance: AdminAuthService;
  private currentUser: AdminUser | null = null;
  private readonly ADMIN_STORAGE_KEY = 'gauner_admin_auth';
  private readonly USERS_STORAGE_KEY = 'gauner_admin_users';
  private readonly CONFIG_STORAGE_KEY = 'gauner_admin_config';
  private readonly PERMISSIONS_STORAGE_KEY = 'gauner_admin_permissions';

  private constructor() {
    this.loadCurrentUser();
    this.initializeDefaultAdmin();
  }

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  // Simple hash function for passwords (in production, use bcrypt)
  private hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Initialize default admin user
  private initializeDefaultAdmin(): void {
    const users = this.getUsers();
    const adminExists = users.find(user => user.username === 'Tafleys');
    
    if (!adminExists) {
      const defaultAdmin: AdminUser = {
        id: 'admin-001',
        username: 'Tafleys',
        passwordHash: this.hashPassword('Sasuke0011!'),
        role: 'admin',
        permissions: ['view_all', 'manage_users', 'manage_api_keys'],
        createdAt: Date.now()
      };
      
      users.push(defaultAdmin);
      this.saveUsers(users);
      console.log('✅ Default admin user created: Tafleys');
    }
  }

  // Load current user from storage
  private loadCurrentUser(): void {
    try {
      const userData = localStorage.getItem(this.ADMIN_STORAGE_KEY);
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      this.currentUser = null;
    }
  }

  // Save current user to storage
  private saveCurrentUser(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem(this.ADMIN_STORAGE_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(this.ADMIN_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving current user:', error);
    }
  }

  // Get all users
  private getUsers(): AdminUser[] {
    try {
      const usersData = localStorage.getItem(this.USERS_STORAGE_KEY);
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  // Save all users
  private saveUsers(users: AdminUser[]): void {
    try {
      localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  // Get permissions
  private getPermissions(): UserPermission[] {
    try {
      const permissionsData = localStorage.getItem(this.PERMISSIONS_STORAGE_KEY);
      return permissionsData ? JSON.parse(permissionsData) : [];
    } catch (error) {
      console.error('Error loading permissions:', error);
      return [];
    }
  }

  // Save permissions
  private savePermissions(permissions: UserPermission[]): void {
    try {
      localStorage.setItem(this.PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
    } catch (error) {
      console.error('Error saving permissions:', error);
    }
  }

  // Login method
  async login(username: string, password: string): Promise<boolean> {
    try {
      const users = this.getUsers();
      const hashedPassword = this.hashPassword(password);
      
      const user = users.find(u => 
        u.username === username && u.passwordHash === hashedPassword
      );

      if (user) {
        // Update last login
        user.lastLogin = new Date().toISOString();
        this.saveUsers(users);
        
        // Set current user
        this.currentUser = user;
        this.saveCurrentUser();
        
        console.log('✅ Admin login successful:', username);
        return true;
      } else {
        console.log('❌ Admin login failed:', username);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  // Logout method
  logout(): void {
    this.currentUser = null;
    this.saveCurrentUser();
    console.log('👋 Admin logged out');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // Get current user
  getCurrentUser(): AdminUser | null {
    return this.currentUser;
  }

  // Check if user has permission
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    
    // Admin has all permissions
    if (this.currentUser.role === 'admin') return true;
    
    // Check user permissions
    return this.currentUser.permissions.includes(permission);
  }

  // Grant permission to user
  async grantPermission(userId: string, permission: string): Promise<boolean> {
    if (!this.isAdmin()) return false;
    
    try {
      const users = this.getUsers();
      const user = users.find(u => u.id === userId);
      
      if (user && !user.permissions.includes(permission)) {
        user.permissions.push(permission);
        this.saveUsers(users);
        
        // Add to permissions log
        const permissions = this.getPermissions();
        const newPermission: UserPermission = {
          id: `perm-${Date.now()}`,
          userId: userId,
          permission: permission,
          grantedBy: this.currentUser!.id,
          grantedAt: new Date().toISOString()
        };
        permissions.push(newPermission);
        this.savePermissions(permissions);
        
        console.log('✅ Permission granted:', permission, 'to user:', userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error granting permission:', error);
      return false;
    }
  }

  // Revoke permission from user
  async revokePermission(userId: string, permission: string): Promise<boolean> {
    if (!this.isAdmin()) return false;
    
    try {
      const users = this.getUsers();
      const user = users.find(u => u.id === userId);
      
      if (user) {
        user.permissions = user.permissions.filter(p => p !== permission);
        this.saveUsers(users);
        console.log('✅ Permission revoked:', permission, 'from user:', userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error revoking permission:', error);
      return false;
    }
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<AdminUser[]> {
    if (!this.isAdmin()) return [];
    return this.getUsers();
  }

  // Create new user (admin only)
  async createUser(username: string, password: string, role: 'admin' | 'user' = 'user'): Promise<boolean> {
    if (!this.isAdmin()) return false;
    
    try {
      // Check if username already exists in admin users
      const adminUsers = this.getUsers();
      if (adminUsers.find(u => u.username === username)) {
        console.log('❌ Username already exists in admin users:', username);
        return false;
      }
      
      // Check if username already exists in regular users
      const regularUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      if (regularUsers.find((u: any) => u.username === username)) {
        console.log('❌ Username already exists in regular users:', username);
        return false;
      }
      
      if (role === 'admin') {
        // Create admin user
        const newAdminUser: AdminUser = {
          id: `admin-${Date.now()}`,
          username: username,
          passwordHash: this.hashPassword(password),
          role: 'admin',
          permissions: ['view_all', 'manage_users', 'manage_api_keys'],
          createdAt: Date.now()
        };
        
        adminUsers.push(newAdminUser);
        this.saveUsers(adminUsers);
      } else {
        // Create regular user in the same format as registration
        const newRegularUser = {
          id: Date.now().toString(),
          username: username,
          email: `${username}@admin-created.com`, // Placeholder email
          azureApiKey: '',
          azureRegion: '',
          createdAt: new Date(),
          hasPermission: true, // Admin-created users get immediate access
          status: 'approved' as const
        };
        
        regularUsers.push(newRegularUser);
        localStorage.setItem('registeredUsers', JSON.stringify(regularUsers));
      }
      
      console.log('✅ New user created:', username, 'as', role);
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  }

  // Update admin configuration
  async updateConfig(config: Partial<AdminConfig>): Promise<boolean> {
    if (!this.isAdmin()) return false;
    
    try {
      const currentConfig = this.getConfig();
      const updatedConfig = { ...currentConfig, ...config };
      
      localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));
      console.log('✅ Admin config updated');
      return true;
    } catch (error) {
      console.error('Error updating config:', error);
      return false;
    }
  }

  // Get admin configuration
  getConfig(): AdminConfig {
    try {
      const configData = localStorage.getItem(this.CONFIG_STORAGE_KEY);
      return configData ? JSON.parse(configData) : {};
    } catch (error) {
      console.error('Error loading config:', error);
      return {};
    }
  }

  // Check if user can access the website
  canAccessWebsite(): boolean {
    if (!this.isAuthenticated()) return false;
    
    // Admin can always access
    if (this.isAdmin()) return true;
    
    // Regular users need 'view_all' permission
    return this.hasPermission('view_all');
  }
}

export default AdminAuthService;
