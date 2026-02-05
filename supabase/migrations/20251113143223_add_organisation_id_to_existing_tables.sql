/*
  # Add Organisation ID to Existing Tables

  1. Changes to Existing Tables
    - Add `organisation_id` column to:
      - `Meet Schedule Data` (meetings/events table)
      - `clients` table
      - `payments` table
      - `meeting_history` table
    - Add foreign key constraints to link to organisations table
    - Create indexes for performance

  2. Security Updates
    - Drop existing public RLS policies
    - Add new RLS policies that filter by organisation_id
    - Ensure users can only access data from their organisation

  3. Notes
    - organisation_id is nullable initially to allow existing data
    - In production, after data migration, this should be made NOT NULL
    - All queries will be filtered by organisation_id for data isolation
*/

-- Add organisation_id to Meet Schedule Data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Meet Schedule Data' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE "Meet Schedule Data" ADD COLUMN organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_meet_schedule_organisation_id ON "Meet Schedule Data" (organisation_id);
  END IF;
END $$;

-- Add organisation_id to clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_clients_organisation_id ON clients (organisation_id);
  END IF;
END $$;

-- Add organisation_id to payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_payments_organisation_id ON payments (organisation_id);
  END IF;
END $$;

-- Add organisation_id to meeting_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_history' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE meeting_history ADD COLUMN organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_meeting_history_organisation_id ON meeting_history (organisation_id);
  END IF;
END $$;

-- Update RLS policies for Meet Schedule Data
DROP POLICY IF EXISTS "Allow public read access to meet schedule" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Allow public insert access to meet schedule" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Allow public update access to meet schedule" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Allow public delete access to meet schedule" ON "Meet Schedule Data";

CREATE POLICY "Users can read own organisation meetings"
  ON "Meet Schedule Data"
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meetings for own organisation"
  ON "Meet Schedule Data"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own organisation meetings"
  ON "Meet Schedule Data"
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own organisation meetings"
  ON "Meet Schedule Data"
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Update RLS policies for clients
DROP POLICY IF EXISTS "Allow public read access to clients" ON clients;
DROP POLICY IF EXISTS "Allow public insert access to clients" ON clients;
DROP POLICY IF EXISTS "Allow public update access to clients" ON clients;
DROP POLICY IF EXISTS "Allow public delete access to clients" ON clients;

CREATE POLICY "Users can read own organisation clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients for own organisation"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own organisation clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own organisation clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Update RLS policies for payments
DROP POLICY IF EXISTS "Allow public read access to payments" ON payments;
DROP POLICY IF EXISTS "Allow public insert access to payments" ON payments;
DROP POLICY IF EXISTS "Allow public update access to payments" ON payments;
DROP POLICY IF EXISTS "Allow public delete access to payments" ON payments;

CREATE POLICY "Users can read own organisation payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for own organisation"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own organisation payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own organisation payments"
  ON payments
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Update RLS policies for meeting_history
DROP POLICY IF EXISTS "Allow authenticated read access to meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Allow authenticated insert access to meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Allow authenticated update access to meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Allow authenticated delete access to meeting history" ON meeting_history;

CREATE POLICY "Users can read own organisation meeting history"
  ON meeting_history
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meeting history for own organisation"
  ON meeting_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own organisation meeting history"
  ON meeting_history
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own organisation meeting history"
  ON meeting_history
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );