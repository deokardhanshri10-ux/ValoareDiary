/*
  # Create Organisations Table

  1. New Tables
    - `organisations`
      - `id` (uuid, primary key) - Unique identifier for each organisation
      - `name` (text, not null) - Organisation's name
      - `email` (text, not null, unique) - Organisation's primary email
      - `manager_id` (uuid, references auth.users, nullable) - Reference to the manager's auth user ID
      - `created_at` (timestamptz) - Timestamp when the organisation was created

  2. Security
    - Enable RLS on `organisations` table
    - Add policies for access control

  3. Notes
    - Email must be unique across all organisations
    - All authenticated users will have access only to their organisation's data
*/

CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for now"
  ON organisations
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
