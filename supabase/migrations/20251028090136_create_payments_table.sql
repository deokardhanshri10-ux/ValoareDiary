/*
  # Create Payments Table

  1. New Tables
    - `payments`
      - `id` (uuid, primary key) - Unique identifier for each payment
      - `client_name` (text) - Name of the client
      - `amount` (numeric) - Payment amount
      - `payment_date` (date) - Date when payment is scheduled
      - `frequency` (text) - Payment frequency (one-time, quarterly, half-yearly, annual)
      - `payment_method` (text) - Method of payment (bank_transfer, cash, upi)
      - `created_at` (timestamptz) - Timestamp when payment was created
      
  2. Security
    - Enable RLS on `payments` table
    - Add policy for all users to read all payments
    - Add policy for all users to insert payments
    - Add policy for all users to update payments
    - Add policy for all users to delete payments

  Note: These policies allow public access. Adjust based on authentication requirements.
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  frequency text NOT NULL DEFAULT 'one-time',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read payments"
  ON payments
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all to insert payments"
  ON payments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update payments"
  ON payments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all to delete payments"
  ON payments
  FOR DELETE
  USING (true);
