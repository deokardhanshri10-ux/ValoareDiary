/*
  # Update RLS Policies for Organisation-Wide Data Sharing with Role-Based Access

  ## Overview
  This migration updates all RLS policies to enable organisation-wide data sharing.
  All users within the same organisation can see the same data, but edit permissions
  are restricted based on user roles.

  ## Role Permissions
  - **manager**: Full access (read, create, update, delete)
  - **associate-editor**: Can read, create, and update (no delete)
  - **associate-viewer**: Read-only access

  ## Changes
  1. Drop all existing permissive policies that allow everything
  2. Create organisation-scoped policies for:
     - Meet Schedule Data
     - meeting_history
     - payments
     - clients
  3. Implement role-based write restrictions

  ## Security
  - All policies check organisation_id to ensure data isolation between organisations
  - User role is verified for write operations
  - Viewers can only SELECT data
*/

-- Helper function to get current user's organisation_id and role
CREATE OR REPLACE FUNCTION get_user_organisation_id()
RETURNS uuid AS $$
  SELECT organisation_id 
  FROM user_profiles 
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role 
  FROM user_profiles 
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_can_edit()
RETURNS boolean AS $$
  SELECT role IN ('manager', 'associate-editor')
  FROM user_profiles 
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_can_delete()
RETURNS boolean AS $$
  SELECT role = 'manager'
  FROM user_profiles 
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on meet schedule" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Allow all operations on meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Allow all operations on payments" ON payments;
DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;

-- ============================================================================
-- Meet Schedule Data Policies
-- ============================================================================

-- SELECT: All authenticated users can view data from their organisation
CREATE POLICY "Users can view organisation meet schedule"
  ON "Meet Schedule Data"
  FOR SELECT
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
  );

-- INSERT: Managers and editors can create new events
CREATE POLICY "Editors can create meet schedule"
  ON "Meet Schedule Data"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  );

-- UPDATE: Managers and editors can update events
CREATE POLICY "Editors can update meet schedule"
  ON "Meet Schedule Data"
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  )
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  );

-- DELETE: Only managers can delete events
CREATE POLICY "Managers can delete meet schedule"
  ON "Meet Schedule Data"
  FOR DELETE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND user_can_delete()
  );

-- ============================================================================
-- Meeting History Policies
-- ============================================================================

-- SELECT: All authenticated users can view meeting history from their organisation
CREATE POLICY "Users can view organisation meeting history"
  ON meeting_history
  FOR SELECT
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
  );

-- INSERT: Managers and editors can create meeting history
CREATE POLICY "Editors can create meeting history"
  ON meeting_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  );

-- UPDATE: Managers and editors can update meeting history
CREATE POLICY "Editors can update meeting history"
  ON meeting_history
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  )
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  );

-- DELETE: Only managers can delete meeting history
CREATE POLICY "Managers can delete meeting history"
  ON meeting_history
  FOR DELETE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND user_can_delete()
  );

-- ============================================================================
-- Payments Policies
-- ============================================================================

-- SELECT: All authenticated users can view payments from their organisation
CREATE POLICY "Users can view organisation payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
  );

-- INSERT: Managers and editors can create payments
CREATE POLICY "Editors can create payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  );

-- UPDATE: Managers and editors can update payments
CREATE POLICY "Editors can update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  )
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  );

-- DELETE: Only managers can delete payments
CREATE POLICY "Managers can delete payments"
  ON payments
  FOR DELETE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND user_can_delete()
  );

-- ============================================================================
-- Clients Policies
-- ============================================================================

-- SELECT: All authenticated users can view clients from their organisation
CREATE POLICY "Users can view organisation clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
  );

-- INSERT: Managers and editors can create clients
CREATE POLICY "Editors can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  );

-- UPDATE: Managers and editors can update clients
CREATE POLICY "Editors can update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  )
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND user_can_edit()
  );

-- DELETE: Only managers can delete clients
CREATE POLICY "Managers can delete clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND user_can_delete()
  );
