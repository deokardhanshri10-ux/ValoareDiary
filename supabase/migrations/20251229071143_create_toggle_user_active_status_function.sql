/*
  # Create Toggle User Active Status Function

  1. Functions
    - `toggle_user_active_status` - Toggles user active/inactive status
      - Takes user_id and new is_active status as parameters
      - Updates the auth_credentials table
      - Returns boolean indicating success

  2. Security
    - Uses SECURITY DEFINER to allow status updates
*/

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