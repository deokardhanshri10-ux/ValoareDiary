/*
  # Create Activity Log System

  1. New Tables
    - `activity_log`
      - `id` (uuid, primary key) - Unique identifier for each activity
      - `user_id` (uuid) - User who performed the action
      - `organisation_id` (uuid) - Organisation context
      - `action_type` (text) - Type of action (create, read, update, delete)
      - `table_name` (text) - Which table was affected
      - `record_id` (text) - ID of the affected record
      - `old_data` (jsonb) - Previous state (for updates/deletes)
      - `new_data` (jsonb) - New state (for creates/updates)
      - `ip_address` (text) - IP address of the user
      - `user_agent` (text) - Browser/client information
      - `created_at` (timestamptz) - When the action occurred

  2. Security
    - Enable RLS on activity_log table
    - Managers can view all logs for their organisation
    - Associate-editors and associate-viewers cannot view logs
    - System can write to logs regardless of user permissions

  3. Indexes
    - Index on user_id for quick user activity lookups
    - Index on organisation_id for organisation-wide queries
    - Index on created_at for time-based queries
    - Index on table_name for table-specific queries
*/

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  username text DEFAULT '',
  action_type text NOT NULL CHECK (action_type IN ('create', 'read', 'update', 'delete', 'login', 'logout')),
  table_name text NOT NULL DEFAULT '',
  record_id text DEFAULT '',
  old_data jsonb DEFAULT '{}'::jsonb,
  new_data jsonb DEFAULT '{}'::jsonb,
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_organisation_id ON activity_log(organisation_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_table_name ON activity_log(table_name);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log(action_type);

-- RLS Policy: Managers can view all logs for their organisation
CREATE POLICY "Managers can view activity logs"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = activity_log.organisation_id
      AND user_profiles.role = 'manager'
    )
  );

-- RLS Policy: System can insert logs (SECURITY DEFINER functions will handle this)
CREATE POLICY "System can insert activity logs"
  ON activity_log FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE activity_log IS 'Tracks all user activities across the system for audit purposes';
COMMENT ON COLUMN activity_log.action_type IS 'Type of action performed: create, read, update, delete, login, logout';
COMMENT ON COLUMN activity_log.table_name IS 'Name of the table affected by the action';
COMMENT ON COLUMN activity_log.record_id IS 'ID of the specific record affected';
COMMENT ON COLUMN activity_log.old_data IS 'Previous state of the data (for updates and deletes)';
COMMENT ON COLUMN activity_log.new_data IS 'New state of the data (for creates and updates)';
