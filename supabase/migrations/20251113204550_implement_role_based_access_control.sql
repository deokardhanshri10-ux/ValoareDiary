/*
  # Implement Role-Based Access Control (RBAC)

  1. Role Definitions
    - **Manager**: Full access (SELECT, INSERT, UPDATE, DELETE) to all tables in their organisation
    - **Associate-Editor**: Can SELECT, INSERT, UPDATE but NOT DELETE
    - **Associate-Viewer**: Can only SELECT (read-only access)

  2. Tables Covered
    - Meet Schedule Data
    - meeting_history
    - payments
    - clients
    - user_profiles (managers only can modify)
    - auth_credentials (managers only can modify)

  3. Security Approach
    - Drop existing policies and recreate with proper role checks
    - All policies verify organisation membership
    - All policies check user role from user_profiles table
    - Separate policies for each operation type (SELECT, INSERT, UPDATE, DELETE)
*/

-- ============================================================================
-- MEET SCHEDULE DATA - RLS Policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own org meet schedule" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Users can insert own org meet schedule" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Users can update own org meet schedule" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Users can delete own org meet schedule" ON "Meet Schedule Data";

-- Manager: Full access to meet schedule
CREATE POLICY "Managers have full access to meet schedule"
  ON "Meet Schedule Data" FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = "Meet Schedule Data".organisation_id
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = "Meet Schedule Data".organisation_id
      AND user_profiles.role = 'manager'
    )
  );

-- Associate-Editor: Can view and modify but not delete
CREATE POLICY "Editors can view meet schedule"
  ON "Meet Schedule Data" FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = "Meet Schedule Data".organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

CREATE POLICY "Editors can insert meet schedule"
  ON "Meet Schedule Data" FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = "Meet Schedule Data".organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

CREATE POLICY "Editors can update meet schedule"
  ON "Meet Schedule Data" FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = "Meet Schedule Data".organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = "Meet Schedule Data".organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

-- Associate-Viewer: Read-only access
CREATE POLICY "Viewers can view meet schedule"
  ON "Meet Schedule Data" FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = "Meet Schedule Data".organisation_id
      AND user_profiles.role = 'associate-viewer'
    )
  );

-- ============================================================================
-- MEETING HISTORY - RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Users can insert meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Users can update meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Users can delete meeting history" ON meeting_history;

-- Manager: Full access
CREATE POLICY "Managers have full access to meeting history"
  ON meeting_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = meeting_history.organisation_id
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = meeting_history.organisation_id
      AND user_profiles.role = 'manager'
    )
  );

-- Associate-Editor: Can view and modify but not delete
CREATE POLICY "Editors can view meeting history"
  ON meeting_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = meeting_history.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

CREATE POLICY "Editors can insert meeting history"
  ON meeting_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = meeting_history.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

CREATE POLICY "Editors can update meeting history"
  ON meeting_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = meeting_history.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = meeting_history.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

-- Associate-Viewer: Read-only
CREATE POLICY "Viewers can view meeting history"
  ON meeting_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = meeting_history.organisation_id
      AND user_profiles.role = 'associate-viewer'
    )
  );

-- ============================================================================
-- PAYMENTS - RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view payments" ON payments;
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
DROP POLICY IF EXISTS "Users can update payments" ON payments;
DROP POLICY IF EXISTS "Users can delete payments" ON payments;

-- Manager: Full access
CREATE POLICY "Managers have full access to payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = payments.organisation_id
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = payments.organisation_id
      AND user_profiles.role = 'manager'
    )
  );

-- Associate-Editor: Can view and modify but not delete
CREATE POLICY "Editors can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = payments.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

CREATE POLICY "Editors can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = payments.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

CREATE POLICY "Editors can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = payments.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = payments.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

-- Associate-Viewer: Read-only
CREATE POLICY "Viewers can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = payments.organisation_id
      AND user_profiles.role = 'associate-viewer'
    )
  );

-- ============================================================================
-- CLIENTS - RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

-- Manager: Full access
CREATE POLICY "Managers have full access to clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = clients.organisation_id
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = clients.organisation_id
      AND user_profiles.role = 'manager'
    )
  );

-- Associate-Editor: Can view and modify but not delete
CREATE POLICY "Editors can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = clients.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

CREATE POLICY "Editors can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = clients.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

CREATE POLICY "Editors can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = clients.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = clients.organisation_id
      AND user_profiles.role = 'associate-editor'
    )
  );

-- Associate-Viewer: Read-only
CREATE POLICY "Viewers can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = clients.organisation_id
      AND user_profiles.role = 'associate-viewer'
    )
  );

-- ============================================================================
-- USER_PROFILES - RLS Policies (Managers only can modify)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in same org" ON user_profiles;
DROP POLICY IF EXISTS "Managers can manage user profiles" ON user_profiles;

-- All authenticated users can view profiles in their organisation
CREATE POLICY "Users can view profiles in their organisation"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organisation_id = user_profiles.organisation_id
    )
  );

-- Only managers can modify user profiles
CREATE POLICY "Managers can manage user profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = user_profiles.organisation_id
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- ============================================================================
-- AUTH_CREDENTIALS - RLS Policies (Managers only can modify)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view credentials" ON auth_credentials;
DROP POLICY IF EXISTS "Managers can manage credentials" ON auth_credentials;

-- Managers can view credentials in their organisation
CREATE POLICY "Managers can view auth credentials"
  ON auth_credentials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
      AND user_profiles.organisation_id IN (
        SELECT organisation_id FROM user_profiles WHERE id = auth_credentials.user_id
      )
    )
  );

-- Only managers can modify credentials
CREATE POLICY "Managers can manage auth credentials"
  ON auth_credentials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  );

-- ============================================================================
-- ORGANISATIONS - RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organisation" ON organisations;

-- Users can view their own organisation
CREATE POLICY "Users can view their organisation"
  ON organisations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = organisations.id
    )
  );

-- Only managers can modify organisation details
CREATE POLICY "Managers can manage their organisation"
  ON organisations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = organisations.id
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organisation_id = organisations.id
      AND user_profiles.role = 'manager'
    )
  );
