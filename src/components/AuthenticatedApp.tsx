import { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Users, History, Lock, Link2 } from 'lucide-react';
import { authService, AuthUser } from '../lib/auth';
import { UserManagement } from './UserManagement';
import { ActivityLog } from './ActivityLog';
import { ChangePassword } from './ChangePassword';

interface AuthenticatedAppProps {
  user: AuthUser;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function AuthenticatedApp({ user, onSignOut, children }: AuthenticatedAppProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleSignOut = () => {
    authService.signOut();
    onSignOut();
  };

  return (
    <>
      {showUserManagement && (
        <UserManagement user={user} onClose={() => setShowUserManagement(false)} />
      )}
      {showActivityLog && (
        <ActivityLog user={user} onClose={() => setShowActivityLog(false)} />
      )}
      {showChangePassword && (
        <ChangePassword user={user} onClose={() => setShowChangePassword(false)} />
      )}
      {children}
    </>
  );
}

export function UserMenu({ user, onShowUserManagement, onShowActivityLog, onShowChangePassword, onShowGoogleOAuth, onSignOut }: {
  user: AuthUser;
  onShowUserManagement: () => void;
  onShowActivityLog: () => void;
  onShowChangePassword: () => void;
  onShowGoogleOAuth: () => void;
  onSignOut: () => void;
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowUserMenu(!showUserMenu);
        }}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="User menu"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <UserIcon className="w-4 h-4 text-white" />
        </div>
      </button>

      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-900">{user.username}</div>
            <div className="text-xs text-gray-600 capitalize">{user.role}</div>
          </div>
          {user.role === 'manager' && (
            <>
              <button
                onClick={() => {
                  onShowUserManagement();
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Manage Users
              </button>
              <button
                onClick={() => {
                  onShowActivityLog();
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                Activity Log
              </button>
              <button
                onClick={() => {
                  onShowGoogleOAuth();
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Google Integration
              </button>
            </>
          )}
          <button
            onClick={() => {
              onShowChangePassword();
              setShowUserMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Change Password
          </button>
          <button
            onClick={() => {
              onSignOut();
              setShowUserMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
