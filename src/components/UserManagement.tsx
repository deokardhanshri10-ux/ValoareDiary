import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, UserPlus, UserX, UserCheck, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../lib/auth';

interface UserManagementProps {
  user: AuthUser;
  onClose: () => void;
}

interface AppUser {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export function UserManagement({ user, onClose }: UserManagementProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'associate-editor' | 'associate-viewer'>('associate-editor');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, role, created_at, last_login')
        .eq('organisation_id', user.organisationId)
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      const userIds = profiles?.map(u => u.id) || [];

      const { data: credentials, error: credError } = await supabase
        .from('auth_credentials')
        .select('user_id, username, is_active')
        .in('user_id', userIds);

      if (credError) throw credError;

      const credMap = new Map(credentials?.map(c => [c.user_id, { username: c.username, is_active: c.is_active }]) || []);

      const formattedUsers: AppUser[] = (profiles || []).map((u: any) => {
        const cred = credMap.get(u.id);
        return {
          id: u.id,
          username: cred?.username || 'N/A',
          role: u.role,
          is_active: cred?.is_active ?? true,
          created_at: u.created_at,
          last_login: u.last_login,
        };
      });

      setUsers(formattedUsers);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const email = `${username.toLowerCase().replace(/\s+/g, '')}@temp.local`;

      const { error } = await supabase.rpc('create_user_with_credentials', {
        p_email: email,
        p_username: username.toLowerCase(),
        p_password: password,
        p_organisation_id: user.organisationId,
        p_role: role,
      });

      if (error) throw error;

      setSuccess(`User created successfully! Username: ${username.toLowerCase()}`);
      setUsername('');
      setPassword('');
      setRole('associate-editor');
      setShowPassword(false);
      setShowAddUser(false);

      await loadUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.rpc('toggle_user_active_status', {
        p_user_id: userId,
        p_is_active: !currentStatus,
      });

      if (error) throw error;

      setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await loadUsers();
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setSuccess('User role updated successfully');
      await loadUsers();
    } catch (err: any) {
      console.error('Error changing user role:', err);
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete user "${username}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.rpc('delete_user_permanently', {
        p_user_id: userId,
      });

      if (error) throw error;

      setSuccess(`User "${username}" deleted successfully`);
      await loadUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    }
  };

  const canManageUsers = user.role === 'manager';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {canManageUsers && !showAddUser && (
            <button
              onClick={() => setShowAddUser(true)}
              className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add New User
            </button>
          )}

          {showAddUser && (
            <form onSubmit={handleAddUser} className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={submitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={generatePassword}
                      disabled={submitting}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'manager' | 'associate-editor' | 'associate-viewer')}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="manager">Manager</option>
                    <option value="associate-editor">Associate - Editor</option>
                    <option value="associate-viewer">Associate - Viewer</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                  >
                    {submitting ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setUsername('');
                      setPassword('');
                      setRole('associate-editor');
                      setShowPassword(false);
                      setError('');
                    }}
                    disabled={submitting}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-600 mt-2">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Login</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                    {canManageUsers && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{u.username}</td>
                      <td className="px-4 py-3 text-sm">
                        {canManageUsers && u.id !== user.userId ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="px-2 py-1 text-xs font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="manager">Manager</option>
                            <option value="associate-editor">Associate - Editor</option>
                            <option value="associate-viewer">Associate - Viewer</option>
                          </select>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {u.role === 'associate-editor' ? 'Associate - Editor' :
                              u.role === 'associate-viewer' ? 'Associate - Viewer' :
                                'Manager'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${u.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {u.last_login ? (
                          <>
                            <div>{new Date(u.last_login).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(u.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      {canManageUsers && u.id !== user.userId && (
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(u.id, u.is_active)}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${u.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                            >
                              {u.is_active ? (
                                <>
                                  <UserX className="w-3 h-3" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                              title="Delete user permanently"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                      {canManageUsers && u.id === user.userId && (
                        <td className="px-4 py-3 text-sm text-gray-400">
                          Current user
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-8 text-gray-600">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
