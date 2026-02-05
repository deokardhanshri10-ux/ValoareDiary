/*
  # Add 'on_call' Meeting Type

  1. Changes
    - Update meeting_type constraint to include 'on_call' option
    - Applies to both 'Meet Schedule Data' and 'meeting_history' tables

  2. Meeting Types
    - 'online' - Virtual meeting with video/audio
    - 'facetoface' - In-person meeting
    - 'on_call' - Phone call meeting
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'Meet Schedule Data' 
      AND constraint_name LIKE '%meeting_type_check%'
  ) THEN
    ALTER TABLE "Meet Schedule Data" DROP CONSTRAINT IF EXISTS "Meet Schedule Data_meeting_type_check";
  END IF;
END $$;

ALTER TABLE "Meet Schedule Data" 
  ADD CONSTRAINT "Meet Schedule Data_meeting_type_check" 
  CHECK (meeting_type IN ('online', 'facetoface', 'on_call'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'meeting_history' 
      AND constraint_name LIKE '%meeting_type_check%'
  ) THEN
    ALTER TABLE meeting_history DROP CONSTRAINT IF EXISTS meeting_history_meeting_type_check;
  END IF;
END $$;

ALTER TABLE meeting_history
  ADD CONSTRAINT meeting_history_meeting_type_check
  CHECK (meeting_type IN ('online', 'facetoface', 'on_call'));
