import { useState, useEffect } from 'react';
import { Link2, Unlink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { oauthService, OAuthConnection } from '../lib/oauth';
import { authService } from '../lib/auth';

export function GoogleOAuth() {
  const [connection, setConnection] = useState<OAuthConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    checkOAuthStatus();

    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('oauth_error');

    if (oauthSuccess === 'true') {
      setSuccess('Google account connected successfully');
      window.history.replaceState({}, '', window.location.pathname);
      checkOAuthStatus();
    } else if (oauthError) {
      setError(`Failed to connect Google account: ${oauthError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkOAuthStatus = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const conn = await oauthService.getOAuthConnection(currentUser.organisationId);
      setConnection(conn);
    } catch (err) {
      console.error('Error checking OAuth status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (!currentUser) return;

    setError(null);
    setSuccess(null);
    oauthService.initiateGoogleOAuth(currentUser.userId, currentUser.organisationId);
  };

  const handleDisconnect = async () => {
    if (!currentUser || !connection) return;

    if (!confirm('Are you sure you want to disconnect your Google account? This will disable automatic Google Meet link generation.')) {
      return;
    }

    setDisconnecting(true);
    setError(null);
    setSuccess(null);

    try {
      const success = await oauthService.disconnectOAuth(currentUser.organisationId);
      if (success) {
        setConnection(null);
        setSuccess('Google account disconnected successfully');
      } else {
        setError('Failed to disconnect Google account');
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError('Failed to disconnect Google account');
    } finally {
      setDisconnecting(false);
    }
  };

  const isTokenExpired = connection && new Date(connection.tokenExpiry) < new Date();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">Loading connection status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            connection ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {connection ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Link2 className="w-5 h-5 text-gray-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Account</h3>
            <p className="text-sm text-gray-600">
              {connection ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      {connection ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <span className="text-sm text-gray-900">{connection.googleEmail}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <span className={`text-sm ${isTokenExpired ? 'text-red-600' : 'text-green-600'}`}>
                {isTokenExpired ? 'Expired' : 'Active'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Connected</span>
              <span className="text-sm text-gray-900">
                {new Date(connection.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {isTokenExpired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700">
                Your token has expired. Please reconnect your Google account.
              </div>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {disconnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Unlink className="w-4 h-4" />
                Disconnect Google Account
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect your Google account to automatically generate Google Meet links for scheduled meetings.
          </p>
          <button
            onClick={handleConnect}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Connect Google Account
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          By connecting your Google account, you grant access to create calendar events and generate Meet links.
        </p>
      </div>
    </div>
  );
}
