/*
  # Update Payments Table for Multiple Due Dates

  1. Changes to Tables
    - `payments`
      - Drop old `payment_date` column
      - Add `due_dates` (jsonb) - Array of due dates for the payment
      
  2. Data Migration
    - Migrate existing single payment_date values to due_dates array format
    - Ensure backward compatibility for any existing payment records
    
  3. Security
    - RLS policies remain unchanged
    - Existing policies continue to work with the updated schema

  Note: This migration converts the single payment_date field to support multiple due dates stored as a JSON array.
*/

-- First, add the new due_dates column as jsonb array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'due_dates'
  ) THEN
    ALTER TABLE payments ADD COLUMN due_dates jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Migrate existing payment_date data to due_dates array format
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_date'
  ) THEN
    UPDATE payments 
    SET due_dates = jsonb_build_array(to_char(payment_date, 'YYYY-MM-DD'))
    WHERE due_dates = '[]'::jsonb OR due_dates IS NULL;
  END IF;
END $$;

-- Drop the old payment_date column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE payments DROP COLUMN payment_date;
  END IF;
END $$;

-- Ensure due_dates is not null
ALTER TABLE payments ALTER COLUMN due_dates SET NOT NULL;
ALTER TABLE payments ALTER COLUMN due_dates SET DEFAULT '[]'::jsonb;
