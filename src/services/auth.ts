// Simple, working authentication service
interface User {
  id: string;
  username: string;
  email: string;
  password: string; // In production, this should be hashed
  role: 'admin' | 'user';
  createdAt: Date;
  hasPermission: boolean;
  azureApiKey?: string;
  azureRegion?: string;
}

interface LoginResult {
  success: boolean;
  message?: string;
  user?: User;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private readonly USERS_KEY = 'gauner_users';
  private readonly CURRENT_USER_KEY = 'gauner_current_user';

  private constructor() {
    this.initializeDefaultUsers();
    this.loadCurrentUser();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize default users
  private initializeDefaultUsers(): void {
    const users = this.getUsers();
    
    // Check if admin user exists
    if (!users.find(u => u.username === 'Tafleys')) {
      const adminUser: User = {
        id: 'admin-001',
        username: 'Tafleys',
        email: 'admin@gauner.com',
        password: 'Sasuke0011!',
        role: 'admin',
        createdAt: new Date(),
        hasPermission: true
      };
      users.push(adminUser);
      this.saveUsers(users);
      console.log('✅ Default admin user created: Tafleys');
    }

    // Check if test user exists
    if (!users.find(u => u.username === 'testuser')) {
      const testUser: User = {
        id: 'user-001',
        username: 'testuser',
        email: 'test@gauner.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(),
        hasPermission: true
      };
      users.push(testUser);
      this.saveUsers(users);
      console.log('✅ Default test user created: testuser');
    }
  }

  // Get all users
  private getUsers(): User[] {
    try {
      const usersData = localStorage.getItem(this.USERS_KEY);
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Save users
  private saveUsers(users: User[]): void {
    try {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  // Load current user from localStorage
  private loadCurrentUser(): void {
    try {
      const userData = localStorage.getItem(this.CURRENT_USER_KEY);
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      this.currentUser = null;
    }
  }

  // Save current user to localStorage
  private saveCurrentUser(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(this.CURRENT_USER_KEY);
      }
    } catch (error) {
      console.error('Error saving current user:', error);
    }
  }

  // Login user
  async login(username: string, password: string): Promise<LoginResult> {
    try {
      console.log('🔐 Attempting login for:', username);
      
      const users = this.getUsers();
      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        if (!user.hasPermission) {
          return {
            success: false,
            message: 'Your account is pending approval. Please contact an administrator.'
          };
        }
        
        this.currentUser = user;
        this.saveCurrentUser();
        
        console.log('✅ Login successful for:', username);
        return {
          success: true,
          user: user
        };
      } else {
        console.log('❌ Login failed for:', username);
        return {
          success: false,
          message: 'Invalid username or password.'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  // Register new user
  async register(username: string, email: string, password: string): Promise<LoginResult> {
    try {
      console.log('📝 Attempting registration for:', username);
      
      const users = this.getUsers();
      
      // Check if user already exists
      if (users.find(u => u.username === username)) {
        return {
          success: false,
          message: 'Username already exists.'
        };
      }
      
      if (users.find(u => u.email === email)) {
        return {
          success: false,
          message: 'Email already exists.'
        };
      }
      
      const newUser: User = {
        id: `user-${Date.now()}`,
        username,
        email,
        password,
        role: 'user',
        createdAt: new Date(),
        hasPermission: false // New users need admin approval
      };
      
      users.push(newUser);
      this.saveUsers(users);
      
      console.log('✅ Registration successful for:', username);
      return {
        success: true,
        message: 'Registration successful! Your account is pending approval.'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  // Logout user
  logout(): void {
    console.log('👋 Logging out user:', this.currentUser?.username);
    this.currentUser = null;
    this.saveCurrentUser();
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // Get all users (admin only)
  getAllUsers(): User[] {
    if (!this.isAdmin()) {
      return [];
    }
    return this.getUsers();
  }

  // Grant permission to user (admin only)
  grantPermission(userId: string): boolean {
    if (!this.isAdmin()) {
      return false;
    }
    
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].hasPermission = true;
      this.saveUsers(users);
      
      // Update current user if it's the same user
      if (this.currentUser?.id === userId) {
        this.currentUser.hasPermission = true;
        this.saveCurrentUser();
      }
      
      return true;
    }
    
    return false;
  }

  // Revoke permission from user (admin only)
  revokePermission(userId: string): boolean {
    if (!this.isAdmin()) {
      return false;
    }
    
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].hasPermission = false;
      this.saveUsers(users);
      
      // Logout current user if it's the same user
      if (this.currentUser?.id === userId) {
        this.logout();
      }
      
      return true;
    }
    
    return false;
  }

  // Remove user (admin only)
  removeUser(userId: string): boolean {
    if (!this.isAdmin()) {
      return false;
    }
    
    const users = this.getUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    
    if (filteredUsers.length < users.length) {
      this.saveUsers(filteredUsers);
      
      // Logout current user if it's the same user
      if (this.currentUser?.id === userId) {
        this.logout();
      }
      
      return true;
    }
    
    return false;
  }

  // Create new user (admin only)
  createUser(username: string, email: string, password: string, role: 'admin' | 'user' = 'user'): boolean {
    if (!this.isAdmin()) {
      return false;
    }
    
    const users = this.getUsers();
    
    // Check if user already exists
    if (users.find(u => u.username === username || u.email === email)) {
      return false;
    }
    
    const newUser: User = {
      id: `${role}-${Date.now()}`,
      username,
      email,
      password,
      role,
      createdAt: new Date(),
      hasPermission: true // Admin-created users get immediate access
    };
    
    users.push(newUser);
    this.saveUsers(users);
    
    return true;
  }

  // Update Azure API key
  updateAzureKey(key: string): boolean {
    if (!this.currentUser) {
      return false;
    }
    
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === this.currentUser!.id);
    
    if (userIndex !== -1) {
      users[userIndex].azureApiKey = key;
      this.saveUsers(users);
      
      // Update current user
      this.currentUser.azureApiKey = key;
      this.saveCurrentUser();
      
      return true;
    }
    
    return false;
  }

  // Update Azure region
  updateAzureRegion(region: string): boolean {
    if (!this.currentUser) {
      return false;
    }
    
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === this.currentUser!.id);
    
    if (userIndex !== -1) {
      users[userIndex].azureRegion = region;
      this.saveUsers(users);
      
      // Update current user
      this.currentUser.azureRegion = region;
      this.saveCurrentUser();
      
      return true;
    }
    
    return false;
  }
}

export default AuthService;
export type { User, LoginResult };
