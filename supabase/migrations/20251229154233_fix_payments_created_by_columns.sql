/*
  # Add Created By Columns to Payments Table

  ## Overview
  This migration adds tracking columns to the payments table to record which user created each payment.

  ## Changes
    1. Add created_by_id column (references user_profiles)
    2. Add created_by_name column for display purposes
    3. Create index for performance
    
  ## Notes
  - Uses IF NOT EXISTS to safely handle if columns already exist
  - Foreign key constraint ensures data integrity
*/

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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by_id);
