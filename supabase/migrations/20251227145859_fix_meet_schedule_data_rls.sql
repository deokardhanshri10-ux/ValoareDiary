/*
  # Fix Meet Schedule Data RLS

  1. Issue
    - "Meet Schedule Data" table has RLS enabled but no policies
    - This prevents all data access
  
  2. Solution
    - Add policy to allow access to organisation data
*/

CREATE POLICY "Allow all access for now"
  ON "Meet Schedule Data"
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
