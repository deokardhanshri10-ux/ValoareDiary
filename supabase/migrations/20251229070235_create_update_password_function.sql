/*
  # Create Update Password Function

  1. Functions
    - `update_user_password` - Securely updates a user's password
      - Takes user_id and new_password as parameters
      - Generates bcrypt hash for the new password
      - Updates the auth_credentials table
      - Returns boolean indicating success

  2. Security
    - Uses SECURITY DEFINER to allow password updates
    - Only updates password hash, no other sensitive data
    - Uses bcrypt with salt for secure password hashing
*/

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