/*
  # Create Clients Table

  1. New Tables
    - `clients`
      - `id` (uuid, primary key) - Unique identifier for each client
      - `name` (text, not null) - Client's name
      - `type` (text, not null) - Client type: 'mutual_funds' or 'holistic'
      - `created_at` (timestamptz) - Timestamp when the client was added

  2. Security
    - Enable RLS on `clients` table
    - Add policy for public read access (temporary - can be restricted later)
    - Add policy for public insert access (temporary - can be restricted later)
    - Add policy for public update access (temporary - can be restricted later)
    - Add policy for public delete access (temporary - can be restricted later)

  3. Notes
    - Client type is restricted to 'mutual_funds' or 'holistic' via check constraint
    - All fields use meaningful defaults where appropriate
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_client_type CHECK (type IN ('mutual_funds', 'holistic'))
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to clients"
  ON clients
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to clients"
  ON clients
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to clients"
  ON clients
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to clients"
  ON clients
  FOR DELETE
  TO public
  USING (true);