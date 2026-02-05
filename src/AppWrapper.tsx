import { useState, useEffect } from 'react';
import { SignIn } from './components/SignIn';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { authService, AuthUser } from './lib/auth';
import App from './App';

export function AppWrapper() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showGoogleOAuth, setShowGoogleOAuth] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleSignInSuccess = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  };

  const handleSignOut = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignIn onSuccess={handleSignInSuccess} />;
  }

  return (
    <AuthenticatedApp user={user} onSignOut={handleSignOut}>
      <App
        user={user}
        onShowUserManagement={() => setShowUserManagement(true)}
        onCloseUserManagement={() => setShowUserManagement(false)}
        showUserManagement={showUserManagement}
        onShowActivityLog={() => setShowActivityLog(true)}
        onShowChangePassword={() => setShowChangePassword(true)}
        showChangePassword={showChangePassword}
        onCloseChangePassword={() => setShowChangePassword(false)}
        onShowGoogleOAuth={() => setShowGoogleOAuth(true)}
        showGoogleOAuth={showGoogleOAuth}
        onCloseGoogleOAuth={() => setShowGoogleOAuth(false)}
        onSignOut={handleSignOut}
      />
    </AuthenticatedApp>
  );
}
