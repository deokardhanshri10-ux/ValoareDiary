/*
  # Add Client Name Column to Meet Schedule Data

  ## Overview
  The application code expects a `client_name` column in the "Meet Schedule Data" table,
  but it was missing from the database schema. This migration adds it back.

  ## Changes
  1. Add `client_name` column to "Meet Schedule Data" table
  2. Add `client_name` column to "meeting_history" table for consistency
  3. Set default value to match the `name` column for existing records

  ## Impact
  - Allows the application to properly store client names for meetings
  - Existing records will have client_name populated with their name value
*/

-- Add client_name column to Meet Schedule Data table
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS client_name text;

-- Set default value for client_name from name column for existing records
UPDATE "Meet Schedule Data" 
SET client_name = name 
WHERE client_name IS NULL;

-- Add client_name column to meeting_history table
ALTER TABLE meeting_history 
ADD COLUMN IF NOT EXISTS client_name text;

-- Set default value for client_name from name column for existing records in history
UPDATE meeting_history 
SET client_name = name 
WHERE client_name IS NULL;

-- Create index for performance on Meet Schedule Data
CREATE INDEX IF NOT EXISTS idx_meet_schedule_client_name ON "Meet Schedule Data" (client_name);

-- Create index for performance on meeting_history
CREATE INDEX IF NOT EXISTS idx_meeting_history_client_name ON meeting_history (client_name);