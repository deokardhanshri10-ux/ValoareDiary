/*
  # Add Attachments Support to Meeting Schedule

  1. Changes
    - Add `attachments` column to "Meet Schedule Data" table as JSONB array
    - Create 'meeting-attachments' storage bucket for file uploads
    - Set up storage policies for authenticated access
    
  2. Attachment Structure
    Each attachment object contains:
    - `name` (string) - Original filename
    - `path` (string) - Storage path
    - `size` (number) - File size in bytes
    - `uploadedAt` (string) - ISO timestamp
    
  3. Security
    - Authenticated users can upload to their organization's folders
    - Files are organized by organization_id for isolation
    - Users can only access files from their organization
*/

-- Add attachments column to Meet Schedule Data table
ALTER TABLE "Meet Schedule Data" 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for meeting attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-attachments', 'meeting-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their organization folder
CREATE POLICY "Users can upload meeting attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT organisation_id::text 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to view files from their organization
CREATE POLICY "Users can view meeting attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT organisation_id::text 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete files from their organization
CREATE POLICY "Users can delete meeting attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT organisation_id::text 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);
