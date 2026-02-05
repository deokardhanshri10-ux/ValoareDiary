/*
  # Create Initial Database Schema
  
  1. New Tables
    - `Meet Schedule Data` - Core table for storing meeting/event schedule
      - `id` (bigserial, primary key) - Unique identifier
      - `client_name` (text) - Name of the client
      - `created_at` (timestamptz) - Record creation timestamp
      
  2. Security
    - Enable RLS on all tables
    - Tables start with no policies (policies added in subsequent migrations)
*/

-- Create Meet Schedule Data table
CREATE TABLE IF NOT EXISTS "Meet Schedule Data" (
  id bigserial PRIMARY KEY,
  client_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE "Meet Schedule Data" ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX IF NOT EXISTS idx_meet_schedule_created_at ON "Meet Schedule Data" (created_at);
