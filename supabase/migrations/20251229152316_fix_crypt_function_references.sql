/*
  # Fix crypt function references to use extensions schema

  1. Changes
    - Update all functions that use crypt() to explicitly reference extensions.crypt()
    - This fixes the "function crypt(text, text) does not exist" error

  2. Functions Updated
    - verify_credentials
    - update_user_password
    - create_user_with_credentials
    - toggle_user_active_status
*/

-- Drop and recreate verify_credentials function with extensions.crypt
DROP FUNCTION IF EXISTS verify_credentials(text, text);

CREATE FUNCTION verify_credentials(
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

  IF v_password_hash IS NULL THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Account is deactivated';
  END IF;

  -- Use extensions.crypt explicitly
  IF v_password_hash = extensions.crypt(p_password, v_password_hash) THEN
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

-- Drop and recreate update_user_password function with extensions.crypt
DROP FUNCTION IF EXISTS update_user_password(uuid, text);

CREATE FUNCTION update_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS boolean AS $$
DECLARE
  v_password_hash text;
BEGIN
  -- Use extensions.crypt and extensions.gen_salt explicitly
  v_password_hash := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));

  UPDATE auth_credentials
  SET 
    password_hash = v_password_hash,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate create_user_with_credentials function with extensions.crypt
DROP FUNCTION IF EXISTS create_user_with_credentials(text, text, text, uuid, text);

CREATE FUNCTION create_user_with_credentials(
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
  -- Use extensions.crypt and extensions.gen_salt explicitly
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

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
    extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
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

  INSERT INTO user_profiles (id, organisation_id, role)
  VALUES (v_user_id, p_organisation_id, p_role);

  INSERT INTO auth_credentials (user_id, username, password_hash)
  VALUES (v_user_id, lower(p_username), v_password_hash);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure toggle_user_active_status exists
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
