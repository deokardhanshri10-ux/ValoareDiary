/*
  # Add 'on_call' Meeting Type

  1. Changes
    - Update meeting_type check constraint to include 'on_call' option
    - Applies to both 'Meet Schedule Data' and 'meeting_history' tables
  
  2. Notes
    - This allows users to schedule phone call meetings
    - On call meetings will not have a location field
    - Uses safe IF EXISTS checks to prevent errors
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'Meet Schedule Data' 
    AND constraint_name LIKE '%meeting_type%'
  ) THEN
    ALTER TABLE "Meet Schedule Data" DROP CONSTRAINT IF EXISTS "Meet Schedule Data_meeting_type_check";
  END IF;
END $$;

ALTER TABLE "Meet Schedule Data" 
  ADD CONSTRAINT "Meet Schedule Data_meeting_type_check" 
  CHECK (meeting_type = ANY (ARRAY['online'::text, 'facetoface'::text, 'on_call'::text]));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'meeting_history' 
    AND constraint_name LIKE '%meeting_type%'
  ) THEN
    ALTER TABLE meeting_history DROP CONSTRAINT IF EXISTS meeting_history_meeting_type_check;
  END IF;
END $$;

ALTER TABLE meeting_history
  ADD CONSTRAINT meeting_history_meeting_type_check
  CHECK (meeting_type = ANY (ARRAY['online'::text, 'facetoface'::text, 'on_call'::text]));