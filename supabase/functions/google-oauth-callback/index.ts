import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('Missing required environment variables');
  console.error('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
  console.error('GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
}

function simpleEncrypt(text: string): string {
  return btoa(text);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    let stateData;
    let returnUrl = 'http://localhost:5173'; // fallback

    // Parse state first to get returnUrl
    if (state) {
      try {
        stateData = JSON.parse(atob(state));
        returnUrl = stateData.returnUrl || returnUrl;
      } catch (e) {
        console.error('Failed to parse state:', e);
      }
    }

    if (error) {
      console.error('OAuth error:', error);
      return Response.redirect(`${returnUrl}?oauth_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return Response.redirect(`${returnUrl}?oauth_error=missing_parameters`);
    }

    if (!stateData) {
      return Response.redirect(`${returnUrl}?oauth_error=invalid_state`);
    }

    const { userId, organisationId } = stateData;
    if (!userId || !organisationId) {
      return Response.redirect(`${returnUrl}?oauth_error=invalid_state_data`);
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      console.error('Status:', tokenResponse.status);
      console.error('Client ID present:', !!GOOGLE_CLIENT_ID);
      console.error('Client Secret present:', !!GOOGLE_CLIENT_SECRET);
      return Response.redirect(`${returnUrl}?oauth_error=token_exchange_failed&details=${encodeURIComponent(errorData.substring(0, 100))}`);
    }

    const tokens = await tokenResponse.json();

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return Response.redirect(`${returnUrl}?oauth_error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json();
    const googleEmail = userInfo.email;

    const expiresIn = tokens.expires_in || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

    const encryptedAccessToken = simpleEncrypt(tokens.access_token);
    const encryptedRefreshToken = simpleEncrypt(tokens.refresh_token);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: deactivateError } = await supabase
      .from('google_oauth_tokens')
      .update({ is_active: false })
      .eq('organisation_id', organisationId)
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Error deactivating old tokens:', deactivateError);
    }

    const { error: insertError } = await supabase
      .from('google_oauth_tokens')
      .insert({
        organisation_id: organisationId,
        connected_by_user_id: userId,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expiry: tokenExpiry,
        google_email: googleEmail,
        is_active: true,
      });

    if (insertError) {
      console.error('Error inserting tokens:', insertError);
      return Response.redirect(`${returnUrl}?oauth_error=storage_failed`);
    }

    return Response.redirect(`${returnUrl}?oauth_success=true`);
  } catch (error) {
    console.error('Unexpected error:', error);
    const returnUrl = 'http://localhost:5173';
    return Response.redirect(`${returnUrl}?oauth_error=unexpected_error`);
  }
});