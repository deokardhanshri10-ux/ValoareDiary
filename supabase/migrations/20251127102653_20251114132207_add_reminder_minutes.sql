/*
  # Add reminder_minutes column to Meet Schedule Data table

  1. New Columns
    - `reminder_minutes` (integer) - Number of minutes before meeting to send reminder
    
  2. Notes
    - Only used when alert_type is set to 'remind'
    - Default is NULL (no specific reminder time set)
*/

ALTER TABLE "Meet Schedule Data"
  ADD COLUMN IF NOT EXISTS reminder_minutes integer;

COMMENT ON COLUMN "Meet Schedule Data".reminder_minutes IS 'Number of minutes before the meeting to send a reminder notification. Only used when alert_type is set to remind.';
