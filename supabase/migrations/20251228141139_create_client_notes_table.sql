/*
  # Create Client Notes Table

  ## Overview
  This migration creates a table to store notes associated with clients.
  Each note captures the date, day, and time when it was written, along with the note content.

  ## 1. New Tables
    - `client_notes`
      - `id` (bigint, primary key) - Unique identifier for each note
      - `client_id` (uuid) - Reference to the client
      - `note_content` (text) - The content of the note
      - `created_at` (timestamptz) - Timestamp when the note was created
      - `organisation_id` (uuid) - Reference to the organisation

  ## 2. Security
    - Enable RLS on client_notes table
    - Allow authenticated and anonymous users to read, insert, update, and delete notes
*/

-- Create client_notes table
CREATE TABLE IF NOT EXISTS client_notes (
  id bigserial PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  note_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_organisation_id ON client_notes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_created_at ON client_notes(created_at DESC);

-- Enable RLS
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy for client_notes
CREATE POLICY "Allow all access for now"
  ON client_notes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
