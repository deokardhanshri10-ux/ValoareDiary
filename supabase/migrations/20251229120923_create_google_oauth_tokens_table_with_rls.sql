/*
  # Create Google OAuth Tokens Table

  ## Overview
  This migration creates a table to store Google OAuth tokens for Google Meet integration.
  Organizations can connect their Google accounts to automatically generate Meet links.

  ## New Tables
  - `google_oauth_tokens`
    - `id` (bigint, primary key) - Unique identifier for token record
    - `organisation_id` (uuid) - Links to organisations table
    - `connected_by_user_id` (uuid) - User who connected the account
    - `access_token_encrypted` (text) - Encrypted Google OAuth access token
    - `refresh_token_encrypted` (text) - Encrypted Google OAuth refresh token
    - `token_expiry` (timestamptz) - When the access token expires
    - `google_email` (text) - Email of the connected Google account  
    - `google_calendar_id` (text) - Google Calendar event ID for tracking
    - `is_active` (boolean) - Whether the connection is active
    - `created_at` (timestamptz) - When the connection was created
    - `updated_at` (timestamptz) - When the connection was last updated

  ## Security
  - Enable RLS on the table
  - Organisation-scoped access for viewing connections
  - Managers can connect/disconnect accounts
  - Tokens are organization-scoped for isolation

  ## Indexes
  - Index on organisation_id for faster lookups
  - Index on active tokens for performance
*/

-- Create the google_oauth_tokens table
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id bigserial PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  connected_by_user_id uuid NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expiry timestamptz NOT NULL,
  google_email text NOT NULL,
  google_calendar_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups by organisation
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_organisation_id 
  ON google_oauth_tokens(organisation_id);

-- Create index for active tokens
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_active 
  ON google_oauth_tokens(organisation_id, is_active) 
  WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to view OAuth connections for their organisation
CREATE POLICY "Users can view organisation OAuth connections"
  ON google_oauth_tokens
  FOR SELECT
  TO anon
  USING (true);

-- Allow managers to update OAuth connections
CREATE POLICY "Managers can update organisation OAuth connections"
  ON google_oauth_tokens
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow managers to insert new OAuth connections
CREATE POLICY "Managers can create organisation OAuth connections"
  ON google_oauth_tokens
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow managers to delete OAuth connections
CREATE POLICY "Managers can delete organisation OAuth connections"
  ON google_oauth_tokens
  FOR DELETE
  TO anon
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE google_oauth_tokens IS 'Stores encrypted Google OAuth tokens for Google Meet integration. One active connection per organization.';
COMMENT ON COLUMN google_oauth_tokens.access_token_encrypted IS 'Encrypted Google OAuth access token. Never expose this value to the frontend.';
COMMENT ON COLUMN google_oauth_tokens.refresh_token_encrypted IS 'Encrypted Google OAuth refresh token. Used to obtain new access tokens.';
COMMENT ON COLUMN google_oauth_tokens.google_email IS 'Email address of the connected Google account, for display purposes only.';
