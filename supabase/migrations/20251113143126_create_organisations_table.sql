/*
  # Create Organisations Table

  1. New Tables
    - `organisations`
      - `id` (uuid, primary key) - Unique identifier for each organisation
      - `name` (text, not null) - Organisation's name
      - `email` (text, not null, unique) - Organisation's primary email (used by manager for login)
      - `manager_id` (uuid, references auth.users) - Reference to the manager's auth user ID
      - `created_at` (timestamptz) - Timestamp when the organisation was created

  2. Security
    - Enable RLS on `organisations` table
    - Add policy for authenticated users to read their own organisation
    - Add policy for public insert access (for first-time setup only)
    - Add policy for authenticated users to update their own organisation
    - Add policy for authenticated users to delete their own organisation

  3. Notes
    - Email must be unique across all organisations
    - Manager ID links to Supabase auth.users table
    - All authenticated users will have access only to their organisation's data
*/

CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  manager_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own organisation"
  ON organisations
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Allow public insert for first-time setup"
  ON organisations
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own organisation"
  ON organisations
  FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Users can delete own organisation"
  ON organisations
  FOR DELETE
  TO authenticated
  USING (manager_id = auth.uid());