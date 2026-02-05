/*
  # Create Authentication Credentials Table

  1. Extensions
    - Enable `pgcrypto` extension for password hashing

  2. New Tables
    - `auth_credentials`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, references auth.users) - Links to Supabase auth user
      - `username` (text, unique, not null) - Login username
      - `password_hash` (text, not null) - Bcrypt hashed password
      - `is_active` (boolean) - Whether account is active
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  3. Security
    - Enable RLS on `auth_credentials` table
    - Only service role can read/write credentials (prevents password exposure)
    - Add indexes for efficient username lookups

  4. Functions
    - `create_user_with_credentials` - Creates auth user, profile, and credentials
    - `verify_credentials` - Verifies username and password combination
    - `update_user_password` - Updates user password securely

  5. Notes
    - Uses bcrypt via pgcrypto for secure password hashing
    - Usernames are case-insensitive (stored as lowercase)
    - All password operations are server-side for security
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create auth_credentials table
CREATE TABLE IF NOT EXISTS auth_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_auth_credentials_username ON auth_credentials(username);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON auth_credentials(user_id);

-- Enable RLS
ALTER TABLE auth_credentials ENABLE ROW LEVEL SECURITY;

-- Only service role can access credentials (no user access to prevent password exposure)
CREATE POLICY "Service role can manage credentials"
  ON auth_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to verify username and password
CREATE OR REPLACE FUNCTION verify_credentials(
  p_username text,
  p_password text
)
RETURNS TABLE(
  user_id uuid,
  organisation_id uuid,
  role text,
  is_active boolean
) AS $$
DECLARE
  v_password_hash text;
  v_user_id uuid;
  v_is_active boolean;
BEGIN
  -- Get password hash and check if user is active
  SELECT 
    ac.password_hash,
    ac.user_id,
    ac.is_active
  INTO 
    v_password_hash,
    v_user_id,
    v_is_active
  FROM auth_credentials ac
  WHERE ac.username = lower(p_username);

  -- Check if user exists and is active
  IF v_password_hash IS NULL THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Account is deactivated';
  END IF;

  -- Verify password using crypt
  IF v_password_hash = crypt(p_password, v_password_hash) THEN
    -- Return user information
    RETURN QUERY
    SELECT 
      up.id,
      up.organisation_id,
      up.role,
      true as is_active
    FROM user_profiles up
    WHERE up.id = v_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user with credentials
CREATE OR REPLACE FUNCTION create_user_with_credentials(
  p_email text,
  p_username text,
  p_password text,
  p_organisation_id uuid,
  p_role text DEFAULT 'staff'
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
BEGIN
  -- Generate password hash
  v_password_hash := crypt(p_password, gen_salt('bf', 10));

  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Create user profile
  INSERT INTO user_profiles (id, organisation_id, role)
  VALUES (v_user_id, p_organisation_id, p_role);

  -- Create auth credentials
  INSERT INTO auth_credentials (user_id, username, password_hash)
  VALUES (v_user_id, lower(p_username), v_password_hash);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user password
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS boolean AS $$
DECLARE
  v_password_hash text;
BEGIN
  -- Generate new password hash
  v_password_hash := crypt(p_new_password, gen_salt('bf', 10));

  -- Update password
  UPDATE auth_credentials
  SET 
    password_hash = v_password_hash,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle user active status
CREATE OR REPLACE FUNCTION toggle_user_active_status(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS boolean AS $$
BEGIN
  UPDATE auth_credentials
  SET 
    is_active = p_is_active,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;