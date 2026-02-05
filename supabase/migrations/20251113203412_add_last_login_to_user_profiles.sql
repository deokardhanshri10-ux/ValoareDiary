/*
  # Add Last Login Tracking to User Profiles

  1. Changes
    - Add `last_login` column to user_profiles table to track when users last logged in
    - Set default to NULL (for users who haven't logged in yet)
    - Add index on last_login for efficient queries

  2. Security
    - No RLS changes needed as existing policies cover this column
*/

-- Add last_login column to track user login activity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_login timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Add index for efficient queries on last_login
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login);

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.last_login IS 'Timestamp of the user''s last successful login';
