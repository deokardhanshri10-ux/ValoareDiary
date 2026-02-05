/*
  # Add Event Columns to Meet Schedule Data

  1. New Columns
    - `name` (text) - Meeting/event name
    - `meeting_type` (text) - Type of meeting: 'online' or 'facetoface'
    - `start_date` (date) - Date of the meeting
    - `start_time` (time) - Time of the meeting
    - `location` (text) - Location for face-to-face or 'Online' for virtual
    - `meeting_link` (text) - URL for online meetings
    - `participants` (text) - Email addresses of participants
    - `agenda` (text) - Meeting agenda/notes
    - `repeat_event` (boolean) - Whether event repeats
    - `alert_type` (text) - Type of alert: 'none', 'remind', or 'include'
    - `meeting_mode` (text) - For online meetings: 'audio' or 'video'
    - `is_online` (boolean) - Quick flag for meeting type
    
  2. Notes
    - All columns allow NULL except required fields
    - Default values set where appropriate
    - Indexes added for frequently queried columns
*/

-- Add name column (required)
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';

-- Add meeting type columns
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'online' CHECK (meeting_type IN ('online', 'facetoface'));

ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT true;

-- Add date and time columns
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS start_date date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS start_time time;

-- Add location and meeting link
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS meeting_link text;

-- Add participants
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS participants text;

-- Add agenda
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS agenda text;

-- Add repeat event flag
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS repeat_event boolean DEFAULT false;

-- Add alert type
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS alert_type text DEFAULT 'none' CHECK (alert_type IN ('none', 'remind', 'include'));

-- Add meeting mode for online meetings
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS meeting_mode text DEFAULT 'audio' CHECK (meeting_mode IN ('audio', 'video'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meet_schedule_start_date ON "Meet Schedule Data" (start_date);
CREATE INDEX IF NOT EXISTS idx_meet_schedule_meeting_type ON "Meet Schedule Data" (meeting_type);
CREATE INDEX IF NOT EXISTS idx_meet_schedule_is_online ON "Meet Schedule Data" (is_online);
