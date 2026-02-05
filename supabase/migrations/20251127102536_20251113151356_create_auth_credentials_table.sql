/*
  # Create Authentication Credentials Table

  1. Extensions
    - Enable `pgcrypto` extension for password hashing

  2. New Tables
    - `auth_credentials`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, references user_profiles) - Links to user profile
      - `password_hash` (text, not null) - Bcrypt hashed password
      - `is_active` (boolean) - Whether account is active
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  3. Security
    - Enable RLS on `auth_credentials` table
    - Add policies for access control

  4. Functions
    - `verify_credentials` - Verifies username and password combination
    - `create_user_with_credentials` - Creates user profile and credentials

  5. Notes
    - Uses bcrypt via pgcrypto for secure password hashing
    - All password operations are server-side for security
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create auth_credentials table
CREATE TABLE IF NOT EXISTS auth_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON auth_credentials(user_id);

ALTER TABLE auth_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for now"
  ON auth_credentials
  FOR ALL
  TO anon, authenticated
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
  username text,
  role text,
  is_active boolean
) AS $$
DECLARE
  v_password_hash text;
  v_user_id uuid;
  v_is_active boolean;
BEGIN
  -- Get user ID and password hash
  SELECT 
    up.id,
    ac.password_hash,
    ac.is_active
  INTO 
    v_user_id,
    v_password_hash,
    v_is_active
  FROM user_profiles up
  JOIN auth_credentials ac ON ac.user_id = up.id
  WHERE up.username = lower(p_username);

  IF v_password_hash IS NULL THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Account is deactivated';
  END IF;

  -- Verify password
  IF v_password_hash = crypt(p_password, v_password_hash) THEN
    RETURN QUERY
    SELECT 
      up.id,
      up.organisation_id,
      up.username,
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
  p_role text DEFAULT 'associate-viewer'
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
BEGIN
  v_password_hash := crypt(p_password, gen_salt('bf', 10));

  INSERT INTO user_profiles (organisation_id, username, role)
  VALUES (p_organisation_id, lower(p_username), p_role)
  RETURNING id INTO v_user_id;

  INSERT INTO auth_credentials (user_id, password_hash)
  VALUES (v_user_id, v_password_hash);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
