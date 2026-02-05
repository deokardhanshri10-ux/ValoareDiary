/*
  # Create Function to Update Last Login

  1. New Functions
    - `update_last_login`: Updates the last_login timestamp for a user
    - Called after successful authentication

  2. Security
    - Function is SECURITY DEFINER to allow updating user_profiles
    - Only updates the last_login field, nothing else
*/

-- Create or replace function to update last login timestamp
CREATE OR REPLACE FUNCTION update_last_login(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles
  SET last_login = now()
  WHERE id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_last_login(uuid) TO authenticated, anon;

-- Add comment to document the function
COMMENT ON FUNCTION update_last_login IS 'Updates the last_login timestamp for a user after successful authentication';
