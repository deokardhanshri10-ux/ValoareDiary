/*
  # Add Amounts Array to Payments Table

  1. Changes to Tables
    - `payments`
      - Add `amounts` (jsonb) - Array of amounts for each due date
      - When frequency is quarterly: 4 amounts
      - When frequency is half-yearly: 2 amounts
      - For one-time and annual: single amount (backward compatible)
      
  2. Data Migration
    - Migrate existing single amount values to amounts array format
    - For existing records, create array with single amount value
    - Ensure backward compatibility
    
  3. Security
    - RLS policies remain unchanged
    - Existing policies continue to work with the updated schema

  Note: This allows users to enter different amounts for each payment installment in quarterly and half-yearly frequencies.
*/

-- Add the new amounts column as jsonb array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'amounts'
  ) THEN
    ALTER TABLE payments ADD COLUMN amounts jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Migrate existing amount data to amounts array format
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'amount'
  ) THEN
    UPDATE payments 
    SET amounts = jsonb_build_array(amount)
    WHERE amounts = '[]'::jsonb OR amounts IS NULL;
  END IF;
END $$;

-- Keep the old amount column for now (don't drop it to maintain backward compatibility)
-- Set amounts as not null with default
ALTER TABLE payments ALTER COLUMN amounts SET NOT NULL;
ALTER TABLE payments ALTER COLUMN amounts SET DEFAULT '[]'::jsonb;
