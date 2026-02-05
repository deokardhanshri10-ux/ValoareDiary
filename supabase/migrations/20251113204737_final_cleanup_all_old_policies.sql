/*
  # Final Cleanup of All Old Policies

  1. Changes
    - Remove ALL old policies that conflict with RBAC system
    - Keep only the new role-based policies
    - Remove public access policies
    - Remove duplicate organisation-based policies

  2. Result
    - Clean slate with only RBAC policies active
    - Secure by default - no public access
    - Clear role-based permissions
*/

-- ============================================================================
-- Meeting History - Remove ALL old policies
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert history" ON meeting_history;
DROP POLICY IF EXISTS "Anyone can read history" ON meeting_history;
DROP POLICY IF EXISTS "Anyone can update history" ON meeting_history;
DROP POLICY IF EXISTS "Users can delete own organisation meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Users can insert meeting history for own organisation" ON meeting_history;
DROP POLICY IF EXISTS "Users can read own organisation meeting history" ON meeting_history;
DROP POLICY IF EXISTS "Users can update own organisation meeting history" ON meeting_history;

-- ============================================================================
-- Payments - Remove ALL old policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow all to delete payments" ON payments;
DROP POLICY IF EXISTS "Allow all to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow all to read payments" ON payments;
DROP POLICY IF EXISTS "Allow all to update payments" ON payments;
DROP POLICY IF EXISTS "Users can delete own organisation payments" ON payments;
DROP POLICY IF EXISTS "Users can insert payments for own organisation" ON payments;
DROP POLICY IF EXISTS "Users can read own organisation payments" ON payments;
DROP POLICY IF EXISTS "Users can update own organisation payments" ON payments;

-- ============================================================================
-- Clients - Remove ALL old policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own organisation clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients for own organisation" ON clients;
DROP POLICY IF EXISTS "Users can read own organisation clients" ON clients;
DROP POLICY IF EXISTS "Users can update own organisation clients" ON clients;

-- ============================================================================
-- Organisations - Remove old policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own organisation" ON organisations;
DROP POLICY IF EXISTS "Users can read own organisation" ON organisations;
DROP POLICY IF EXISTS "Users can update own organisation" ON organisations;
DROP POLICY IF EXISTS "Allow public insert for first-time setup" ON organisations;

-- ============================================================================
-- User Profiles - Remove old policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read profiles in their organisation" ON user_profiles;
DROP POLICY IF EXISTS "Managers can delete profiles in their organisation" ON user_profiles;
DROP POLICY IF EXISTS "Managers can update profiles in their organisation" ON user_profiles;
DROP POLICY IF EXISTS "Allow public insert for first-time setup" ON user_profiles;

-- ============================================================================
-- Auth Credentials - Keep service role policy for system operations
-- ============================================================================
-- Service role policy is needed for the create_user_with_credentials function
