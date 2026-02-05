/*
  # Add Attachments Support to Meeting Schedule (Custom Auth Compatible)

  ## Changes
  1. Add `attachments` column to "Meet Schedule Data" table as JSONB array
  2. Create 'meeting-attachments' storage bucket for file uploads
  3. Set up storage policies compatible with custom authentication (anon access)
  
  ## Attachment Structure
  Each attachment object contains:
  - `name` (string) - Original filename
  - `path` (string) - Storage path
  - `size` (number) - File size in bytes
  - `uploadedAt` (string) - ISO timestamp
  
  ## Security
  - Files are organized by organization_id for isolation
  - Access control is handled at application level with custom auth
*/

-- Add attachments column to Meet Schedule Data table
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for meeting attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-attachments', 'meeting-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anon/authenticated users to upload files (custom auth system)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Users can upload meeting attachments'
  ) THEN
    CREATE POLICY "Users can upload meeting attachments"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'meeting-attachments');
  END IF;
END $$;

-- Allow anon/authenticated users to view files (custom auth system)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Users can view meeting attachments'
  ) THEN
    CREATE POLICY "Users can view meeting attachments"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'meeting-attachments');
  END IF;
END $$;

-- Allow anon/authenticated users to delete files (custom auth system)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Users can delete meeting attachments'
  ) THEN
    CREATE POLICY "Users can delete meeting attachments"
    ON storage.objects FOR DELETE
    TO anon, authenticated
    USING (bucket_id = 'meeting-attachments');
  END IF;
END $$;