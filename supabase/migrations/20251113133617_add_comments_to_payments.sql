/*
  # Add Comments to Payments Table

  1. Changes to Tables
    - `payments`
      - Add `comments` (text) - Optional comments/notes for the payment
      
  2. Security
    - RLS policies remain unchanged
    - Existing policies continue to work with the updated schema

  Note: This allows users to add notes or comments to scheduled payments for better tracking and record-keeping.
*/

-- Add the comments column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'comments'
  ) THEN
    ALTER TABLE payments ADD COLUMN comments text;
  END IF;
END $$;
