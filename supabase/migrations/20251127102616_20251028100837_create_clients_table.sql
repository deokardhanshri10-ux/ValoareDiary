/*
  # Create Clients Table

  1. New Tables
    - `clients`
      - `id` (uuid, primary key) - Unique identifier for each client
      - `name` (text, not null) - Client's name
      - `type` (text, not null) - Client type: 'mutual_funds' or 'holistic'
      - `organisation_id` (uuid) - Organisation reference
      - `created_at` (timestamptz) - Timestamp

  2. Security
    - Enable RLS on `clients` table

  3. Notes
    - Client type is restricted to 'mutual_funds' or 'holistic'
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_client_type CHECK (type IN ('mutual_funds', 'holistic'))
);

CREATE INDEX IF NOT EXISTS idx_clients_organisation ON clients(organisation_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for now"
  ON clients
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
