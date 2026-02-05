/*
  # Create Payments Table

  1. New Tables
    - `payments`
      - `id` (uuid, primary key) - Unique identifier for each payment
      - `client_name` (text) - Name of the client
      - `amount` (numeric) - Payment amount
      - `due_dates` (date[]) - Array of due dates
      - `amounts` (numeric[]) - Array of amounts matching due dates
      - `frequency` (text) - Payment frequency
      - `payment_method` (text) - Method of payment
      - `payment_status` (jsonb) - Status of each payment
      - `comments` (text) - Additional notes
      - `organisation_id` (uuid) - Organisation reference
      - `created_at` (timestamptz) - Timestamp
      
  2. Security
    - Enable RLS on `payments` table
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_dates date[] DEFAULT '{}',
  amounts numeric[] DEFAULT '{}',
  frequency text NOT NULL DEFAULT 'one-time',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  payment_status jsonb DEFAULT '{}',
  comments text,
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_organisation ON payments(organisation_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for now"
  ON payments
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
