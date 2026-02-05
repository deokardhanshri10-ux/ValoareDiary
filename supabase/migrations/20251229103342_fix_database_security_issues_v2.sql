/*
  # Fix Database Security Issues

  ## Overview
  This migration addresses critical security and performance issues identified by Supabase:
  
  ## 1. Add Missing Foreign Key Indexes
    - Add index on `organisations.manager_id` for better FK query performance
    - Add index on `user_profiles.organisation_id` for better FK query performance
  
  ## 2. Fix RLS Policy Performance
    - Update `activity_log` policy to use SELECT wrapper for auth functions
    - This prevents re-evaluation of auth.uid() for each row
  
  ## 3. Remove Duplicate Policies
    - Drop redundant "Allow read access to user profiles" policy
    - Keep only "Allow all operations on user profiles" policy
  
  ## 4. Set Search Path on Functions
    - Add search_path to security definer functions to prevent schema injection
    - Functions: verify_credentials, create_user_with_credentials, update_user_password, toggle_user_active_status
  
  ## 5. Notes
    - Unused indexes are kept as they will be used as data grows
    - Password leak protection and MFA settings must be configured in Supabase Auth dashboard
*/

-- 1. Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_organisations_manager_id 
  ON organisations(manager_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_organisation_id 
  ON user_profiles(organisation_id);

-- 2. Fix RLS policy on activity_log to use SELECT wrapper
DROP POLICY IF EXISTS "Managers can view activity logs" ON activity_log;

CREATE POLICY "Managers can view activity logs"
  ON activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.organisation_id = activity_log.organisation_id
      AND user_profiles.role = 'manager'
    )
  );

-- 3. Remove duplicate policy on user_profiles
DROP POLICY IF EXISTS "Allow read access to user profiles" ON user_profiles;

-- 4. Set search_path on security definer functions to prevent injection attacks

-- Drop and recreate verify_credentials function
DROP FUNCTION IF EXISTS verify_credentials(text, text);

CREATE FUNCTION verify_credentials(
  p_username text,
  p_password text
)
RETURNS TABLE (
  user_id uuid,
  organisation_id uuid,
  role text,
  username text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.organisation_id,
    up.role,
    ac.username
  FROM auth_credentials ac
  JOIN user_profiles up ON ac.user_id = up.id
  WHERE ac.username = p_username
    AND ac.password_hash = crypt(p_password, ac.password_hash)
    AND ac.is_active = true;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Drop and recreate create_user_with_credentials function
DROP FUNCTION IF EXISTS create_user_with_credentials(text, text, text, uuid, text);

CREATE FUNCTION create_user_with_credentials(
  p_email text,
  p_username text,
  p_password text,
  p_organisation_id uuid,
  p_role text
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  INSERT INTO user_profiles (organisation_id, username, role)
  VALUES (p_organisation_id, p_username, p_role)
  RETURNING id INTO v_user_id;

  INSERT INTO auth_credentials (user_id, username, password_hash, is_active)
  VALUES (v_user_id, p_username, crypt(p_password, gen_salt('bf')), true);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Drop and recreate update_user_password function
DROP FUNCTION IF EXISTS update_user_password(uuid, text, text);

CREATE FUNCTION update_user_password(
  p_user_id uuid,
  p_old_password text,
  p_new_password text
)
RETURNS boolean AS $$
DECLARE
  v_current_hash text;
BEGIN
  SELECT password_hash INTO v_current_hash
  FROM auth_credentials
  WHERE user_id = p_user_id;

  IF v_current_hash IS NULL THEN
    RETURN false;
  END IF;

  IF v_current_hash != crypt(p_old_password, v_current_hash) THEN
    RETURN false;
  END IF;

  UPDATE auth_credentials
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Drop and recreate toggle_user_active_status function
DROP FUNCTION IF EXISTS toggle_user_active_status(uuid, boolean);

CREATE FUNCTION toggle_user_active_status(
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Add comment explaining remaining warnings
COMMENT ON TABLE activity_log IS 'Activity log for audit trail. Unused indexes will be utilized as data volume grows.';
COMMENT ON TABLE meeting_history IS 'Meeting history archive. Unused indexes will be utilized as data volume grows.';
COMMENT ON TABLE "Meet Schedule Data" IS 'Active meeting schedule. Unused indexes will be utilized as data volume grows.';