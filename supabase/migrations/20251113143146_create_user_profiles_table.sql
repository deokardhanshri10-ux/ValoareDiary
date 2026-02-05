/*
  # Create User Profiles Table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users) - Links to Supabase auth user
      - `organisation_id` (uuid, references organisations) - Organisation this user belongs to
      - `role` (text, not null) - User role: 'manager' or 'staff'
      - `created_at` (timestamptz) - Timestamp when the profile was created

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policy for authenticated users to read profiles in their organisation
    - Add policy for public insert access (for first-time manager setup)
    - Add policy for managers to update profiles in their organisation
    - Add policy for managers to delete profiles in their organisation

  3. Notes
    - User role is restricted to 'manager' or 'staff' via check constraint
    - Each auth user can have only one profile
    - Profiles are linked to organisations for multi-tenant support
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'manager',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('manager', 'staff'))
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read profiles in their organisation"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow public insert for first-time setup"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Managers can update profiles in their organisation"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid() AND role = 'manager'
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can delete profiles in their organisation"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );