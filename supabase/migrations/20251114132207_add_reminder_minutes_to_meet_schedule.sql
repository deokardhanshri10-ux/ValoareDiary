/*
  # Add reminder_minutes column to Meet Schedule Data table

  ## Changes
  - Add `reminder_minutes` column to store custom reminder time
    - Type: integer (number of minutes before meeting)
    - Default: 30 (30 minutes before meeting)
    - Nullable: allows flexibility for events without reminders
  
  ## Purpose
  - Store user-defined reminder time for each meeting
  - Support reminder notifications at the specified time before meetings
  - Works in conjunction with alert_type='remind'
*/

-- Add reminder_minutes column
ALTER TABLE "Meet Schedule Data"
ADD COLUMN IF NOT EXISTS reminder_minutes integer DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN "Meet Schedule Data".reminder_minutes IS 'Number of minutes before the meeting to send a reminder notification. Only used when alert_type is set to remind.';