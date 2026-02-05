/*
  # Fix Meeting History RLS Policies

  ## Overview
  Updates RLS policies for meeting_history table to allow public access
  since the app doesn't use authentication yet.

  ## Changes
  - Drop existing authenticated-only policies
  - Add new public access policies for SELECT, INSERT, UPDATE
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read all history" ON meeting_history;
DROP POLICY IF EXISTS "Authenticated users can insert history" ON meeting_history;
DROP POLICY IF EXISTS "Authenticated users can update history" ON meeting_history;

-- Create new public policies
CREATE POLICY "Anyone can read history"
  ON meeting_history
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert history"
  ON meeting_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update history"
  ON meeting_history
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Update storage policies to allow public access
DROP POLICY IF EXISTS "Authenticated users can upload MOM files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read MOM files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their MOM files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their MOM files" ON storage.objects;

CREATE POLICY "Anyone can upload MOM files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'mom-files');

CREATE POLICY "Anyone can read MOM files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'mom-files');

CREATE POLICY "Anyone can update MOM files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'mom-files')
  WITH CHECK (bucket_id = 'mom-files');

CREATE POLICY "Anyone can delete MOM files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'mom-files');