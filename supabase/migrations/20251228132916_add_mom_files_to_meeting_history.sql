/*
  # Add mom_files column to meeting_history table

  ## Overview
  This migration adds the missing `mom_files` column to the meeting_history table.
  This column stores an array of uploaded Minutes of Meeting files as a JSONB array.

  ## Changes
    1. Add `mom_files` column (jsonb) with default empty array
    2. This column stores file metadata including paths and names for uploaded MOM documents
*/

-- Add mom_files column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_history' AND column_name = 'mom_files'
  ) THEN
    ALTER TABLE meeting_history ADD COLUMN mom_files jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
