# Quick Fix for "accounts.google.com refused to connect"

## The Problem
You're seeing this error because Google doesn't recognize your redirect URI.

## The Solution (5 minutes)

### Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/credentials

### Step 2: Find Your OAuth Client
- Click on your OAuth 2.0 Client ID (the one you created for this app)

### Step 3: Add the Redirect URI
In the **Authorized redirect URIs** section, add this EXACT URI:

```
https://kudptumbipdlayxvvbhc.supabase.co/functions/v1/google-oauth-callback
```

**IMPORTANT**:
- Copy and paste it EXACTLY as shown above
- Do NOT add any spaces before or after
- Do NOT change any part of the URL
- Make sure it starts with `https://` not `http://`

### Step 4: Save
- Click the **Save** button at the bottom
- Wait 2-3 minutes for changes to take effect

### Step 5: Test Again
- Go back to your application
- Try to connect your Google account again
- It should now work!

## Still Not Working?

Check these:

1. **Is the Client ID correct?**
   - Your `.env` file should have: `VITE_GOOGLE_CLIENT_ID=79967112788-lohda0rikfi8boj78u0c3uc03kaj81g1.apps.googleusercontent.com`
   - This should match what's in Google Cloud Console

2. **Did you enable the required APIs?**
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Google Calendar API" and enable it
   - Search for "Google People API" and enable it

3. **Is your OAuth consent screen configured?**
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Make sure you've added the required scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/userinfo.email`

4. **Clear your browser cache**
   - Sometimes old OAuth attempts get cached
   - Try in an incognito/private window

## Need More Help?

Check the full setup guide: `OAUTH_SETUP.md`
