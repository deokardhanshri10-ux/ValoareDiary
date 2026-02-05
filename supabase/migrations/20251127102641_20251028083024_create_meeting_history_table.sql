/*
  # Create Meeting History Table

  1. New Tables
    - `meeting_history`
      - All columns from Meet Schedule Data
      - `original_event_id` - Reference to original event
      - `moved_at` - When it was moved to history
      
  2. Security
    - Enable RLS on `meeting_history` table
*/

CREATE TABLE IF NOT EXISTS meeting_history (
  id bigserial PRIMARY KEY,
  original_event_id bigint,
  client_name text NOT NULL,
  name text NOT NULL DEFAULT '',
  meeting_type text DEFAULT 'online',
  is_online boolean DEFAULT true,
  start_date date NOT NULL,
  start_time time,
  location text,
  meeting_link text,
  participants text,
  agenda text,
  repeat_event boolean DEFAULT false,
  alert_type text DEFAULT 'none',
  meeting_mode text DEFAULT 'audio',
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  moved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_history_organisation ON meeting_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_meeting_history_original_event ON meeting_history(original_event_id);

ALTER TABLE meeting_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for now"
  ON meeting_history
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
