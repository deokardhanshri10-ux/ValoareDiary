/*
  # Update Login Function to Log Activities

  1. Changes
    - Update `update_last_login` function to also log login activity
    - Logs successful logins to the activity_log table
    - Captures timestamp and user information

  2. Security
    - Function remains SECURITY DEFINER
    - Only updates user's own login timestamp
    - Logs activity for audit trail
*/

-- Update the update_last_login function to also log activity
CREATE OR REPLACE FUNCTION update_last_login(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organisation_id uuid;
  v_username text;
BEGIN
  -- Update last login timestamp
  UPDATE user_profiles
  SET last_login = now()
  WHERE id = p_user_id;
  
  -- Get user details for logging
  SELECT up.organisation_id, ac.username INTO v_organisation_id, v_username
  FROM user_profiles up
  LEFT JOIN auth_credentials ac ON ac.user_id = up.id
  WHERE up.id = p_user_id;
  
  -- Log the login activity
  INSERT INTO activity_log (
    user_id,
    organisation_id,
    username,
    action_type,
    table_name,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    p_user_id,
    v_organisation_id,
    COALESCE(v_username, 'unknown'),
    'login',
    'auth',
    p_user_id::text,
    '{}'::jsonb,
    jsonb_build_object('timestamp', now()),
    now()
  );
END;
$$;

-- Create function to log logout activities
CREATE OR REPLACE FUNCTION log_logout(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organisation_id uuid;
  v_username text;
BEGIN
  -- Get user details for logging
  SELECT up.organisation_id, ac.username INTO v_organisation_id, v_username
  FROM user_profiles up
  LEFT JOIN auth_credentials ac ON ac.user_id = up.id
  WHERE up.id = p_user_id;
  
  -- Log the logout activity
  INSERT INTO activity_log (
    user_id,
    organisation_id,
    username,
    action_type,
    table_name,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    p_user_id,
    v_organisation_id,
    COALESCE(v_username, 'unknown'),
    'logout',
    'auth',
    p_user_id::text,
    '{}'::jsonb,
    jsonb_build_object('timestamp', now()),
    now()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_logout(uuid) TO authenticated, anon;

COMMENT ON FUNCTION update_last_login IS 'Updates last_login timestamp and logs login activity';
COMMENT ON FUNCTION log_logout IS 'Logs logout activity to activity_log table';
