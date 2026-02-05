/*
  # Add Row Level Security Policies for Meet Schedule Data

  1. Security Policies
    - Add policy to allow anyone to SELECT (read) events
    - Add policy to allow anyone to INSERT (create) events
    - Add policy to allow anyone to UPDATE events
    - Add policy to allow anyone to DELETE events
    
  2. Notes
    - These are open policies for public access
    - Consider restricting to authenticated users in production
*/

-- Allow anyone to read events
CREATE POLICY "Allow public read access"
  ON "Meet Schedule Data"
  FOR SELECT
  USING (true);

-- Allow anyone to insert events
CREATE POLICY "Allow public insert access"
  ON "Meet Schedule Data"
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update events
CREATE POLICY "Allow public update access"
  ON "Meet Schedule Data"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete events
CREATE POLICY "Allow public delete access"
  ON "Meet Schedule Data"
  FOR DELETE
  USING (true);
