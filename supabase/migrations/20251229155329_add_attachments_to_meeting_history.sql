/*
  # Add Attachments to Meeting History

  ## Overview
  This migration adds attachments column to meeting_history table to preserve
  file attachments when meetings are moved to history.

  ## Changes
    1. Add attachments column to meeting_history (JSONB array)
    
  ## Notes
  - Uses IF NOT EXISTS to safely handle if column already exists
  - Default empty array to ensure consistency
*/

-- Add attachments column to meeting_history table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_history' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE meeting_history ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
