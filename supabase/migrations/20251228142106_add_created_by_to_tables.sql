/*
  # Add Created By Tracking

  ## Overview
  This migration adds columns to track which user created meetings and payments.
  This information will be displayed in the event details modal.

  ## Changes
    1. Add created_by columns
       - Add created_by_id to meet_schedule_data (references user_profiles)
       - Add created_by_name to meet_schedule_data
       - Add created_by_id to payments (references user_profiles)
       - Add created_by_name to payments
       - Add created_by_id to meeting_history (references user_profiles)
       - Add created_by_name to meeting_history
    
    2. Create indexes for performance
*/

-- Add created_by columns to Meet Schedule Data table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Meet Schedule Data' AND column_name = 'created_by_id'
  ) THEN
    ALTER TABLE "Meet Schedule Data" ADD COLUMN created_by_id uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Meet Schedule Data' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE "Meet Schedule Data" ADD COLUMN created_by_name text;
  END IF;
END $$;

-- Add created_by columns to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'created_by_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN created_by_id uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE payments ADD COLUMN created_by_name text;
  END IF;
END $$;

-- Add created_by columns to meeting_history table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_history' AND column_name = 'created_by_id'
  ) THEN
    ALTER TABLE meeting_history ADD COLUMN created_by_id uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_history' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE meeting_history ADD COLUMN created_by_name text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meet_schedule_created_by ON "Meet Schedule Data"(created_by_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by_id);
CREATE INDEX IF NOT EXISTS idx_meeting_history_created_by ON meeting_history(created_by_id);
