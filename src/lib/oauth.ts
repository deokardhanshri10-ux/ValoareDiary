import { supabase } from './supabase';

export interface OAuthConnection {
  id: number;
  organisationId: string;
  connectedByUserId: string;
  googleEmail: string;
  tokenExpiry: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export const oauthService = {
  initiateGoogleOAuth(userId: string, organisationId: string): void {
    // Include the current origin in state so callback knows where to redirect
    const returnUrl = window.location.origin;
    const state = btoa(JSON.stringify({
      userId,
      organisationId,
      returnUrl,
      timestamp: Date.now()
    }));

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirect_uri: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`,
      response_type: 'code',
      scope: GOOGLE_OAUTH_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    console.log('OAuth URL:', oauthUrl);
    console.log('Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log('Redirect URI:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`);
    console.log('Return URL:', returnUrl);

    window.location.href = oauthUrl;
  },

  async getOAuthConnection(organisationId: string): Promise<OAuthConnection | null> {
    try {
      const { data, error } = await supabase
        .from('google_oauth_tokens')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching OAuth connection:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        organisationId: data.organisation_id,
        connectedByUserId: data.connected_by_user_id,
        googleEmail: data.google_email,
        tokenExpiry: data.token_expiry,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error getting OAuth connection:', error);
      return null;
    }
  },

  async disconnectOAuth(organisationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('google_oauth_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('organisation_id', organisationId)
        .eq('is_active', true);

      if (error) {
        console.error('Error disconnecting OAuth:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error disconnecting OAuth:', error);
      return false;
    }
  },

  async checkTokenExpiry(organisationId: string): Promise<boolean> {
    const connection = await this.getOAuthConnection(organisationId);
    if (!connection) return false;

    const expiry = new Date(connection.tokenExpiry);
    const now = new Date();
    const buffer = 5 * 60 * 1000;

    return expiry.getTime() - now.getTime() < buffer;
  },

  async refreshTokenIfNeeded(organisationId: string): Promise<void> {
    const needsRefresh = await this.checkTokenExpiry(organisationId);

    if (needsRefresh) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refresh-google-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ organisationId }),
          }
        );

        if (!response.ok) {
          console.error('Failed to refresh token');
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }
  },
};
