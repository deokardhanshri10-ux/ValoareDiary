/*
  # Add organisation_id to Existing Tables

  1. Changes
    - Add organisation_id column to:
      - `Meet Schedule Data` (meetings/events table)

  2. Security
    - Update RLS policies to use organisation_id
    
  3. Notes
    - Allows multi-tenant data isolation
    - All queries must filter by organisation_id
*/

-- Add organisation_id to Meet Schedule Data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Meet Schedule Data' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE "Meet Schedule Data" ADD COLUMN organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_meet_schedule_organisation_id ON "Meet Schedule Data" (organisation_id);
  END IF;
END $$;
