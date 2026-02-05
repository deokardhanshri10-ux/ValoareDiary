/*
  # Add created_by tracking columns to meeting_history table

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
    WHERE table_name = 'meeting_history' AND column_name = 'created_by_id'
  ) THEN
    ALTER TABLE meeting_history ADD COLUMN created_by_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add created_by_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_history' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE meeting_history ADD COLUMN created_by_name text;
  END IF;
END $$;

-- Add index for efficient lookups by creator
CREATE INDEX IF NOT EXISTS idx_meeting_history_created_by ON meeting_history(created_by_id);
