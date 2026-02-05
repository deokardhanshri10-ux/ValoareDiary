# Google OAuth Setup Guide

This guide will help you set up Google OAuth for your application to enable Google Meet integration.

## Prerequisites

1. A Google Cloud Console account
2. Access to your application's environment variables

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID for reference

## Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **APIs & Services > Library**
2. Search for and enable the following APIs:
   - **Google Calendar API**
   - **Google+ API** (for user profile information)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type (or Internal if using Google Workspace)
3. Fill in the required information:
   - **App name**: Your application name
   - **User support email**: Your support email
   - **Developer contact email**: Your email
4. Click **Save and Continue**

5. Add the following scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`

6. Click **Save and Continue**
7. Review and complete the consent screen setup

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application** as the application type
4. Configure the OAuth client:
   - **Name**: Your application name
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local development)
     - `https://your-production-domain.com` (for production)
   - **Authorized redirect URIs** - THIS IS CRITICAL:
     - **MUST BE EXACTLY**: `https://kudptumbipdlayxvvbhc.supabase.co/functions/v1/google-oauth-callback`
     - Copy and paste this exact URL - even a single character difference will cause errors

5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

**IMPORTANT**: The redirect URI must match your Supabase URL exactly. The URI above is based on your current Supabase project. If you get a "refused to connect" error, double-check this URI in your Google Cloud Console.

## Step 5: Configure Environment Variables

### Frontend Environment Variables

Add these to your `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Backend Environment Variables (Supabase Edge Functions)

The following environment variables need to be set in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings > Edge Functions**
3. Add the following secrets:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
   - `FRONTEND_URL`: Your frontend URL (e.g., `http://localhost:5173` or `https://your-domain.com`)

You can set these using the Supabase CLI:

```bash
supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id_here
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret_here
supabase secrets set FRONTEND_URL=http://localhost:5173
```

## Step 6: Test the OAuth Flow

1. Start your application
2. Navigate to the Google OAuth connection section
3. Click "Connect Google Account"
4. You should be redirected to Google's OAuth consent screen
5. Grant the requested permissions
6. You should be redirected back to your application with a success message

## Security Notes

1. **Never commit your OAuth credentials to version control**
2. The access tokens are encrypted before being stored in the database
3. Tokens are refreshed automatically when they expire
4. Only active tokens are used for generating Meet links
5. Users can disconnect their Google account at any time

## Troubleshooting

### Error: "accounts.google.com refused to connect"

This error means the redirect URI is not properly configured in Google Cloud Console.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Click on your OAuth 2.0 Client ID
4. In the **Authorized redirect URIs** section, add this EXACT URI:
   ```
   https://kudptumbipdlayxvvbhc.supabase.co/functions/v1/google-oauth-callback
   ```
5. Click **Save**
6. Wait a few minutes for the changes to propagate
7. Try connecting again

**Common mistakes:**
- Missing the `/functions/v1/` part
- Using `http://` instead of `https://`
- Adding extra spaces or characters
- Wrong Supabase project URL

### Error: redirect_uri_mismatch

- Verify that the redirect URI in your Google Cloud Console matches exactly:
  `https://kudptumbipdlayxvvbhc.supabase.co/functions/v1/google-oauth-callback`
- Check for trailing slashes or extra characters

### Error: access_denied

- Check that all required scopes are configured in the OAuth consent screen
- Ensure the user has granted all requested permissions
- Make sure your app is published (or add test users if in testing mode)

### Error: invalid_client

- Verify that the `VITE_GOOGLE_CLIENT_ID` in your `.env` file matches the Client ID from Google Cloud Console
- Check that you copied the entire Client ID without any spaces

### Token Refresh Failures

- Verify that the `GOOGLE_CLIENT_SECRET` is set correctly in Supabase Edge Function secrets
- Check that the refresh token hasn't been revoked
- Users may need to reconnect their account if the refresh token is invalid

## OAuth Flow Architecture

1. User clicks "Connect Google Account"
2. User is redirected to Google's OAuth consent screen
3. User grants permissions
4. Google redirects to the callback edge function with an authorization code
5. The edge function exchanges the code for access and refresh tokens
6. Tokens are encrypted and stored in the database
7. User is redirected back to the application

## API References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
