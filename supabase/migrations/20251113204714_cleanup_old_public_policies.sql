/*
  # Clean Up Old Public Access Policies

  1. Changes
    - Remove all public access policies that bypass authentication
    - Remove duplicate old policies that conflict with new RBAC system
    - Ensure only role-based policies remain active

  2. Security Impact
    - Removes insecure public access
    - Enforces authentication requirement
    - Ensures role-based access control is properly enforced
*/

-- ============================================================================
-- Remove insecure public policies from Meet Schedule Data
-- ============================================================================

DROP POLICY IF EXISTS "Allow public delete access" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Allow public insert access" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Allow public read access" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Allow public update access" ON "Meet Schedule Data";

-- Remove old duplicate policies
DROP POLICY IF EXISTS "Users can delete own organisation meetings" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Users can insert meetings for own organisation" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Users can read own organisation meetings" ON "Meet Schedule Data";
DROP POLICY IF EXISTS "Users can update own organisation meetings" ON "Meet Schedule Data";

-- ============================================================================
-- Remove old public policies from other tables
-- ============================================================================

-- Meeting History
DROP POLICY IF EXISTS "Allow public delete access" ON meeting_history;
DROP POLICY IF EXISTS "Allow public insert access" ON meeting_history;
DROP POLICY IF EXISTS "Allow public read access" ON meeting_history;
DROP POLICY IF EXISTS "Allow public update access" ON meeting_history;

-- Payments
DROP POLICY IF EXISTS "Allow public delete access" ON payments;
DROP POLICY IF EXISTS "Allow public insert access" ON payments;
DROP POLICY IF EXISTS "Allow public read access" ON payments;
DROP POLICY IF EXISTS "Allow public update access" ON payments;

-- Clients
DROP POLICY IF EXISTS "Allow public delete access" ON clients;
DROP POLICY IF EXISTS "Allow public insert access" ON clients;
DROP POLICY IF EXISTS "Allow public read access" ON clients;
DROP POLICY IF EXISTS "Allow public update access" ON clients;

-- Organisations
DROP POLICY IF EXISTS "Allow public read access" ON organisations;
DROP POLICY IF EXISTS "Allow public insert access" ON organisations;
DROP POLICY IF EXISTS "Allow public update access" ON organisations;
DROP POLICY IF EXISTS "Allow public delete access" ON organisations;

-- User Profiles
DROP POLICY IF EXISTS "Allow public read access" ON user_profiles;

-- Auth Credentials
DROP POLICY IF EXISTS "Allow public read access" ON auth_credentials;
