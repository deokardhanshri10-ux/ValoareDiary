import { useState, useEffect } from 'react';
import { X, History, Filter, Download, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../lib/auth';

interface ActivityLogProps {
  user: AuthUser;
  onClose: () => void;
}

interface ActivityRecord {
  id: string;
  username: string;
  action_type: string;
  table_name: string;
  record_id: string;
  created_at: string;
  new_data?: any;
}

export function ActivityLog({ user, onClose }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [uniqueUsers, setUniqueUsers] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // 1. Get user profiles for this organisation
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('organisation_id', user.organisationId);

      if (profileError) throw profileError;

      const userIds = profiles?.map(u => u.id) || [];

      if (userIds.length === 0) return;

      // 2. Get usernames from auth_credentials
      const { data: credentials, error: credError } = await supabase
        .from('auth_credentials')
        .select('username')
        .in('user_id', userIds);

      if (credError) throw credError;

      const usernames = credentials?.map(c => c.username) || [];
      setUniqueUsers(usernames.sort());
    } catch (err) {
      console.error('Error loading users for filter:', err);
    }
  };

  const loadActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, username, action_type, table_name, record_id, created_at, new_data')
        .eq('organisation_id', user.organisationId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      setActivities(data || []);

      setActivities(data || []);
      // uniqueUsers is now loaded from loadUsers()
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filterAction !== 'all' && activity.action_type !== filterAction) return false;
    if (filterUser !== 'all' && activity.username !== filterUser) return false;
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'User', 'Action', 'Table', 'Record ID'];
    const rows = filteredActivities.map(a => [
      new Date(a.created_at).toLocaleDateString(),
      new Date(a.created_at).toLocaleTimeString(),
      a.username,
      a.action_type,
      a.table_name,
      a.record_id
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
              <p className="text-sm text-gray-600">All user activities in your organisation</p>

            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>

          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map(username => (
              <option key={username} value={username}>{username}</option>
            ))}
          </select>

          <button
            onClick={exportToCSV}
            className="ml-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-600 mt-4">Loading activity log...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              No activities found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date & Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Table</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Record ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredActivities.map((activity) => (
                    <>
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>{new Date(activity.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(activity.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {activity.username}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action_type)}`}>
                            {activity.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {activity.table_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                          {activity.record_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {activity.new_data && (
                            <button
                              onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
                              className="text-gray-400 hover:text-blue-500 focus:outline-none"
                            >
                              {expandedId === activity.id ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === activity.id && activity.new_data && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Change Details
                              </h4>
                              <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(activity.new_data, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {filteredActivities.length} of {activities.length} activities
          </p>
        </div>
      </div>
    </div>
  );
}
