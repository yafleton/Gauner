import React, { useState, useEffect } from 'react';
import { useSimpleAuth } from '../contexts/SimpleAuthContext';
import { Eye, EyeOff, Shield, Users, Settings, Key, Trash2 } from 'lucide-react';

const SimpleAdminPanel: React.FC = () => {
  const { 
    user, 
    logout, 
    getAllUsers, 
    grantPermission, 
    revokePermission, 
    removeUser, 
    createUser 
  } = useSimpleAuth();
  
  const [activeTab, setActiveTab] = useState<'users' | 'config'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    role: 'user' as 'admin' | 'user' 
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      alert('Please fill in all fields');
      return;
    }

    setCreatingUser(true);
    try {
      const success = createUser(newUser.username, newUser.email, newUser.password, newUser.role);
      if (success) {
        alert('User created successfully!');
        setNewUser({ username: '', email: '', password: '', role: 'user' });
        await loadUsers();
      } else {
        alert('Failed to create user. Username or email may already exist.');
      }
    } catch (error) {
      alert('Error creating user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleGrantPermission = async (userId: string) => {
    try {
      const success = grantPermission(userId);
      if (success) {
        alert('Permission granted successfully!');
        await loadUsers();
      } else {
        alert('Failed to grant permission');
      }
    } catch (error) {
      alert('Error granting permission');
    }
  };

  const handleRevokePermission = async (userId: string) => {
    try {
      const success = revokePermission(userId);
      if (success) {
        alert('Permission revoked successfully!');
        await loadUsers();
      } else {
        alert('Failed to revoke permission');
      }
    } catch (error) {
      alert('Error revoking permission');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      return;
    }

    try {
      const success = removeUser(userId);
      if (success) {
        alert('User removed successfully!');
        await loadUsers();
      } else {
        alert('Failed to remove user');
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
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
                            <span className="text-gray-400 ml-2">({userItem.email})</span>
                            {userItem.role === 'admin' && (
                              <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs ml-2">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Created: {new Date(userItem.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Permission: {userItem.hasPermission ? 'Granted' : 'Pending'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {userItem.hasPermission ? (
                          <button
                            onClick={() => handleRevokePermission(userItem.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Revoke Access
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGrantPermission(userItem.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Grant Access
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleRemoveUser(userItem.id)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  );
};

export default SimpleAdminPanel;
