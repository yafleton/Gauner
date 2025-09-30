import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { Eye, EyeOff, Shield, Users, Settings, Key } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const { login } = useAdmin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (!success) {
        setError('Invalid username or password');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
          <p className="text-gray-400">Access the admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Default admin: <span className="text-purple-400">Tafleys</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const { logout, user, updateConfig, getConfig, getUsers, grantPermission, revokePermission, createUser } = useAdmin();
  const [activeTab, setActiveTab] = useState<'users' | 'config'>('users');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' as 'admin' | 'user' });
  const [creatingUser, setCreatingUser] = useState(false);

  const config = getConfig();

  React.useEffect(() => {
    setYoutubeApiKey(config.youtubeApiKey || '');
    setAzureRegion(config.azureRegion || '');
  }, [config]);

  React.useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      console.log('🔄 Loading users...');
      
      // Get both admin users and regular users
      const adminUsers = await getUsers();
      const regularUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      
      console.log('👑 Admin users:', adminUsers);
      console.log('👥 Regular users:', regularUsers);
      console.log('📊 Total users found:', adminUsers.length + regularUsers.length);
      
      // Combine and format users
      const allUsers = [
        ...adminUsers.map((user: any) => ({ ...user, type: 'admin' })),
        ...regularUsers.map((user: any) => ({ ...user, type: 'regular' }))
      ];
      
      console.log('🔗 All users combined:', allUsers);
      console.log('✅ Setting users state with', allUsers.length, 'users');
      setUsers(allUsers);
    } catch (error) {
      console.error('❌ Error loading users:', error);
    } finally {
      setLoadingUsers(false);
      console.log('🏁 Finished loading users');
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await updateConfig({
        youtubeApiKey: youtubeApiKey,
        azureRegion: azureRegion
      });
      alert('Configuration saved successfully!');
    } catch (error) {
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert('Please fill in all fields');
      return;
    }

    setCreatingUser(true);
    try {
      const success = await createUser(newUser.username, newUser.password, newUser.role);
      if (success) {
        setNewUser({ username: '', password: '', role: 'user' });
        await loadUsers();
        alert('User created successfully!');
      } else {
        alert('Failed to create user');
      }
    } catch (error) {
      alert('Error creating user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleGrantPermission = async (userId: string, userType: string) => {
    try {
      if (userType === 'admin') {
        const success = await grantPermission(userId, 'view_all');
        if (success) {
          await loadUsers();
          alert('Permission granted successfully!');
        } else {
          alert('Failed to grant permission');
        }
      } else {
        // Handle regular user permission
        const regularUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const updatedUsers = regularUsers.map((user: any) => 
          user.id === userId 
            ? { ...user, hasPermission: true, status: 'approved' }
            : user
        );
        localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
        await loadUsers();
        alert('Permission granted successfully!');
      }
    } catch (error) {
      alert('Error granting permission');
    }
  };

  const handleRevokePermission = async (userId: string, userType: string) => {
    try {
      if (userType === 'admin') {
        const success = await revokePermission(userId, 'view_all');
        if (success) {
          await loadUsers();
          alert('Permission revoked successfully!');
        } else {
          alert('Failed to revoke permission');
        }
      } else {
        // Handle regular user permission
        const regularUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const updatedUsers = regularUsers.map((user: any) => 
          user.id === userId 
            ? { ...user, hasPermission: false, status: 'rejected' }
            : user
        );
        localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
        await loadUsers();
        alert('Permission revoked successfully!');
      }
    } catch (error) {
      alert('Error revoking permission');
    }
  };

  const handleRemoveUser = async (userId: string, userType: string) => {
    if (!window.confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      return;
    }

    try {
      if (userType === 'admin') {
        // Remove admin user
        const adminUsers = await getUsers();
        const updatedAdminUsers = adminUsers.filter((user: any) => user.id !== userId);
        localStorage.setItem('gauner_admin_users', JSON.stringify(updatedAdminUsers));
        await loadUsers();
        alert('Admin user removed successfully!');
      } else {
        // Remove regular user
        const regularUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const updatedRegularUsers = regularUsers.filter((user: any) => user.id !== userId);
        localStorage.setItem('registeredUsers', JSON.stringify(updatedRegularUsers));
        await loadUsers();
        alert('User removed successfully!');
      }
    } catch (error) {
      alert('Error removing user');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-500 mr-3" />
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users className="h-5 w-5 inline mr-2" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'config'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Settings className="h-5 w-5 inline mr-2" />
              Configuration
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'users' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-6">User Management</h2>
            
            {/* Create New User */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-md font-medium text-white mb-4">Create New User</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
                  className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={handleCreateUser}
                  disabled={creatingUser}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>

            {/* Users List */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium text-white">Users ({users.length})</h3>
                <button
                  onClick={loadUsers}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Refresh
                </button>
              </div>
              
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="text-gray-400">Loading users...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((userItem) => (
                    <div key={userItem.id} className="bg-gray-600 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="text-white font-medium">
                            {userItem.username}
                            {userItem.email && <span className="text-gray-400 ml-2">({userItem.email})</span>}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Type: {userItem.type} | Created: {new Date(userItem.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Status: {userItem.status || 'N/A'} | 
                            Permission: {userItem.hasPermission ? 'Granted' : 'Pending'}
                          </div>
                          {userItem.type === 'admin' && (
                            <div className="text-gray-400 text-sm">
                              Permissions: {userItem.permissions?.length > 0 ? userItem.permissions.join(', ') : 'None'}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {userItem.type === 'admin' ? (
                          // Admin user permissions
                          userItem.permissions?.includes('view_all') ? (
                            <button
                              onClick={() => handleRevokePermission(userItem.id, 'admin')}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Revoke Access
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGrantPermission(userItem.id, 'admin')}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Grant Access
                            </button>
                          )
                        ) : (
                          // Regular user permissions
                          userItem.hasPermission ? (
                            <button
                              onClick={() => handleRevokePermission(userItem.id, 'regular')}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Revoke Access
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGrantPermission(userItem.id, 'regular')}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Grant Access
                            </button>
                          )
                        )}
                        
                        {/* Remove User Button */}
                        <button
                          onClick={() => handleRemoveUser(userItem.id, userItem.type)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {users.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Configuration</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Key className="h-4 w-4 inline mr-2" />
                  YouTube API Key
                </label>
                <input
                  type="password"
                  value={youtubeApiKey}
                  onChange={(e) => setYoutubeApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter YouTube API key"
                />
                <p className="text-gray-400 text-sm mt-1">
                  This key will be used globally for all users
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Azure Region
                </label>
                <select
                  value={azureRegion}
                  onChange={(e) => setAzureRegion(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Azure Region</option>
                  <option value="eastus">East US</option>
                  <option value="westus">West US</option>
                  <option value="westeurope">West Europe</option>
                  <option value="eastasia">East Asia</option>
                </select>
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminSystem: React.FC = () => {
  const { isAuthenticated } = useAdmin();

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return <AdminPanel />;
};

export default AdminSystem;
