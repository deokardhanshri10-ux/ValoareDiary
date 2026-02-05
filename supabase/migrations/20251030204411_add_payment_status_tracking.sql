/*
  # Add Payment Status Tracking

  1. Changes to Tables
    - `payments`
      - Add `payment_status` (jsonb) - Tracks status for each due date
        Format: { "2024-01-15": "paid", "2024-04-15": "unpaid" }
      
  2. Notes
    - Status is stored as a JSON object mapping due dates to their status
    - Possible values: "paid" or "unpaid"
    - Default is empty object, status can be set on or after the due date
    
  3. Security
    - RLS policies remain unchanged
    - Existing policies continue to work with the updated schema
*/

-- Add payment_status column to track status for each due date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_status jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Ensure payment_status is not null
ALTER TABLE payments ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE payments ALTER COLUMN payment_status SET DEFAULT '{}'::jsonb;
