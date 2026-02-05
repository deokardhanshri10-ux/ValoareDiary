/*
  # Create User Profiles Table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key) - User ID
      - `organisation_id` (uuid, references organisations) - Organisation this user belongs to
      - `username` (text, unique, not null) - Username for login
      - `role` (text, not null) - User role: 'manager', 'associate-editor', or 'associate-viewer'
      - `created_at` (timestamptz) - Timestamp when the profile was created

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policies for access control

  3. Notes
    - User role can be 'manager', 'associate-editor', or 'associate-viewer'
    - Profiles are linked to organisations for multi-tenant support
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'associate-viewer',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('manager', 'associate-editor', 'associate-viewer'))
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for now"
  ON user_profiles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
