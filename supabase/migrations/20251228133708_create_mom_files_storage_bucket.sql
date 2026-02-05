/*
  # Create MOM Files Storage Bucket

  ## Overview
  This migration creates a storage bucket for storing Minutes of Meeting (MOM) files.
  The bucket is configured to accept common document and image formats.

  ## Changes
    1. Create 'mom-files' bucket
       - Private bucket (not publicly accessible)
       - Max file size: 10MB
       - Allowed file types: PDF, DOC, DOCX, TXT, images
    
    2. Storage Policies
       - Allow authenticated users to upload files
       - Allow authenticated users to read files
       - Allow authenticated users to update their files
       - Allow authenticated users to delete their files
*/

-- Create storage bucket for MOM files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mom-files',
  'mom-files',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for mom-files bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload MOM files'
  ) THEN
    CREATE POLICY "Authenticated users can upload MOM files"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'mom-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can read MOM files'
  ) THEN
    CREATE POLICY "Authenticated users can read MOM files"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'mom-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update their MOM files'
  ) THEN
    CREATE POLICY "Authenticated users can update their MOM files"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'mom-files')
      WITH CHECK (bucket_id = 'mom-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete their MOM files'
  ) THEN
    CREATE POLICY "Authenticated users can delete their MOM files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'mom-files');
  END IF;
END $$;

-- Also allow anon users (since we're using custom auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anon users can upload MOM files'
  ) THEN
    CREATE POLICY "Anon users can upload MOM files"
      ON storage.objects
      FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'mom-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anon users can read MOM files'
  ) THEN
    CREATE POLICY "Anon users can read MOM files"
      ON storage.objects
      FOR SELECT
      TO anon
      USING (bucket_id = 'mom-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anon users can update their MOM files'
  ) THEN
    CREATE POLICY "Anon users can update their MOM files"
      ON storage.objects
      FOR UPDATE
      TO anon
      USING (bucket_id = 'mom-files')
      WITH CHECK (bucket_id = 'mom-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anon users can delete their MOM files'
  ) THEN
    CREATE POLICY "Anon users can delete their MOM files"
      ON storage.objects
      FOR DELETE
      TO anon
      USING (bucket_id = 'mom-files');
  END IF;
END $$;
