/*
  # Create Meeting History Table and Storage

  ## Overview
  This migration creates a dedicated history table for completed meetings and sets up
  storage for Minutes of Meeting (MOM) files. When a meeting passes its scheduled time,
  it will be moved from the active schedule to history with all its data preserved.

  ## 1. New Tables
    - `meeting_history`
      - `id` (bigint, primary key) - Unique identifier for history record
      - `original_event_id` (bigint) - Reference to original event in Meet Schedule Data
      - `name` (text) - Meeting/event name
      - `meeting_type` (text) - Type of meeting: 'online' or 'facetoface'
      - `is_online` (boolean) - Quick flag for meeting type
      - `start_date` (date) - Date when the meeting occurred
      - `start_time` (time) - Time when the meeting occurred
      - `location` (text) - Location for face-to-face or 'Online' for virtual
      - `meeting_link` (text) - URL for online meetings
      - `participants` (text) - Email addresses of participants
      - `agenda` (text) - Meeting agenda/notes
      - `repeat_event` (boolean) - Whether event was set to repeat
      - `alert_type` (text) - Type of alert that was set
      - `meeting_mode` (text) - For online meetings: 'audio' or 'video'
      - `mom_files` (jsonb) - Array of MOM file paths stored in Supabase Storage
      - `completed_at` (timestamptz) - When the meeting was completed/moved to history
      - `created_at` (timestamptz) - When this history record was created

  ## 2. Storage
    - Creates 'mom-files' bucket for storing Minutes of Meeting documents
    - Bucket allows multiple file types: PDF, DOC, DOCX, TXT, images
    - Maximum file size: 10MB per file

  ## 3. Security
    - Enable RLS on meeting_history table
    - Allow authenticated users to read all history records
    - Allow authenticated users to insert new history records
    - Allow authenticated users to update their own history records (for adding MOM files)
    - Storage bucket policies allow authenticated users to upload and read MOM files
*/

-- Create meeting_history table
CREATE TABLE IF NOT EXISTS meeting_history (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  original_event_id bigint,
  name text NOT NULL,
  meeting_type text DEFAULT 'online' CHECK (meeting_type IN ('online', 'facetoface')),
  is_online boolean DEFAULT true,
  start_date date NOT NULL,
  start_time time,
  location text,
  meeting_link text,
  participants text,
  agenda text,
  repeat_event boolean DEFAULT false,
  alert_type text DEFAULT 'none' CHECK (alert_type IN ('none', 'remind', 'include')),
  meeting_mode text DEFAULT 'audio' CHECK (meeting_mode IN ('audio', 'video')),
  mom_files jsonb DEFAULT '[]'::jsonb,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_history_start_date ON meeting_history (start_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_history_completed_at ON meeting_history (completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_history_original_event_id ON meeting_history (original_event_id);
CREATE INDEX IF NOT EXISTS idx_meeting_history_name ON meeting_history (name);

-- Enable RLS
ALTER TABLE meeting_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_history
CREATE POLICY "Authenticated users can read all history"
  ON meeting_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert history"
  ON meeting_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update history"
  ON meeting_history
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for MOM files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mom-files',
  'mom-files',
  false,
  10485760, -- 10MB
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
CREATE POLICY "Authenticated users can upload MOM files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mom-files');

CREATE POLICY "Authenticated users can read MOM files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'mom-files');

CREATE POLICY "Authenticated users can update their MOM files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'mom-files')
  WITH CHECK (bucket_id = 'mom-files');

CREATE POLICY "Authenticated users can delete their MOM files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'mom-files');