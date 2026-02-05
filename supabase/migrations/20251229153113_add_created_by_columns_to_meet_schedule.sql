/*
  # Add created_by tracking columns to Meet Schedule Data table

  1. Changes
    - Add `created_by_id` column to track which user created the meeting
    - Add `created_by_name` column to store the user's name at creation time
    
  2. Security
    - These columns are nullable to maintain backward compatibility with existing data
    - They help track who created each meeting for audit purposes
*/

-- Add created_by_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Meet Schedule Data' AND column_name = 'created_by_id'
  ) THEN
    ALTER TABLE "Meet Schedule Data" ADD COLUMN created_by_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add created_by_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Meet Schedule Data' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE "Meet Schedule Data" ADD COLUMN created_by_name text;
  END IF;
END $$;

-- Add index for efficient lookups by creator
CREATE INDEX IF NOT EXISTS idx_meet_schedule_created_by ON "Meet Schedule Data"(created_by_id);
