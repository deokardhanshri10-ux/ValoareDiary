import { supabase } from './supabase';

export interface AuthUser {
  userId: string;
  id: string;
  organisationId: string;
  role: 'manager' | 'associate-editor' | 'associate-viewer';
  username: string;
  fullName: string;
}

const AUTH_STORAGE_KEY = 'app_auth_user';
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000;

export const authService = {
  async signIn(username: string, password: string): Promise<AuthUser> {
    try {
      const { data, error } = await supabase.rpc('verify_credentials', {
        p_username: username,
        p_password: password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw new Error(error.message || 'Invalid username or password');
      }

      if (!data || data.length === 0) {
        throw new Error('Invalid username or password');
      }

      const userData = data[0];
      const authUser: AuthUser = {
        userId: userData.user_id,
        id: userData.user_id,
        organisationId: userData.organisation_id,
        role: userData.role,
        username: username.toLowerCase(),
        fullName: username.toLowerCase(),
      };

      // Update last login timestamp in the database
      await supabase.rpc('update_last_login', {
        p_user_id: userData.user_id,
      });

      const sessionData = {
        ...authUser,
        timestamp: Date.now(),
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));

      return authUser;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  },

  signOut(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  getCurrentUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;

      const sessionData = JSON.parse(stored);
      const now = Date.now();
      const sessionAge = now - sessionData.timestamp;

      if (sessionAge > SESSION_TIMEOUT) {
        this.signOut();
        return null;
      }

      return {
        userId: sessionData.userId,
        id: sessionData.id || sessionData.userId,
        organisationId: sessionData.organisationId,
        role: sessionData.role,
        username: sessionData.username,
        fullName: sessionData.fullName || sessionData.username,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  refreshSession(): void {
    const user = this.getCurrentUser();
    if (user) {
      const sessionData = {
        ...user,
        timestamp: Date.now(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
    }
  },
};
