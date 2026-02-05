/*
  # Create Automatic Activity Logging Triggers

  1. New Functions
    - `log_activity_trigger()`: Function that logs all INSERT, UPDATE, DELETE operations
    - Automatically captures old and new data states
    - Records user information and action type

  2. Triggers Created
    - Triggers on all main tables: Meet Schedule Data, meeting_history, payments, clients
    - Fires AFTER INSERT, UPDATE, DELETE operations
    - Does not fire on activity_log itself to prevent infinite loops

  3. Implementation Details
    - Uses TG_OP to determine operation type
    - Captures OLD and NEW row data as JSONB
    - Gets organisation_id from the affected record
    - Gets username from user_profiles
*/

-- Create function to log activities
CREATE OR REPLACE FUNCTION log_activity_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_username text;
  v_organisation_id uuid;
  v_action_type text;
  v_old_data jsonb;
  v_new_data jsonb;
  v_record_id text;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  -- Get username from user_profiles
  SELECT up.organisation_id, ac.username INTO v_organisation_id, v_username
  FROM user_profiles up
  LEFT JOIN auth_credentials ac ON ac.user_id = up.id
  WHERE up.id = v_user_id;
  
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_new_data := to_jsonb(NEW);
    v_old_data := '{}'::jsonb;
    v_record_id := COALESCE((NEW.id)::text, '');
    
    -- Get organisation_id from NEW record if available
    IF v_organisation_id IS NULL THEN
      v_organisation_id := (NEW.organisation_id)::uuid;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    v_new_data := to_jsonb(NEW);
    v_old_data := to_jsonb(OLD);
    v_record_id := COALESCE((NEW.id)::text, '');
    
    -- Get organisation_id from NEW record if available
    IF v_organisation_id IS NULL THEN
      v_organisation_id := (NEW.organisation_id)::uuid;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_new_data := '{}'::jsonb;
    v_old_data := to_jsonb(OLD);
    v_record_id := COALESCE((OLD.id)::text, '');
    
    -- Get organisation_id from OLD record if available
    IF v_organisation_id IS NULL THEN
      v_organisation_id := (OLD.organisation_id)::uuid;
    END IF;
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_log (
    user_id,
    organisation_id,
    username,
    action_type,
    table_name,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    v_user_id,
    v_organisation_id,
    COALESCE(v_username, 'system'),
    v_action_type,
    TG_TABLE_NAME,
    v_record_id,
    v_old_data,
    v_new_data,
    now()
  );
  
  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================================================
-- Create Triggers on All Main Tables
-- ============================================================================

-- Meet Schedule Data triggers
DROP TRIGGER IF EXISTS log_meet_schedule_activity ON "Meet Schedule Data";
CREATE TRIGGER log_meet_schedule_activity
  AFTER INSERT OR UPDATE OR DELETE ON "Meet Schedule Data"
  FOR EACH ROW
  EXECUTE FUNCTION log_activity_trigger();

-- Meeting History triggers
DROP TRIGGER IF EXISTS log_meeting_history_activity ON meeting_history;
CREATE TRIGGER log_meeting_history_activity
  AFTER INSERT OR UPDATE OR DELETE ON meeting_history
  FOR EACH ROW
  EXECUTE FUNCTION log_activity_trigger();

-- Payments triggers
DROP TRIGGER IF EXISTS log_payments_activity ON payments;
CREATE TRIGGER log_payments_activity
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_activity_trigger();

-- Clients triggers
DROP TRIGGER IF EXISTS log_clients_activity ON clients;
CREATE TRIGGER log_clients_activity
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION log_activity_trigger();

-- User Profiles triggers (for user management activities)
DROP TRIGGER IF EXISTS log_user_profiles_activity ON user_profiles;
CREATE TRIGGER log_user_profiles_activity
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_activity_trigger();

-- Auth Credentials triggers (for credential management)
DROP TRIGGER IF EXISTS log_auth_credentials_activity ON auth_credentials;
CREATE TRIGGER log_auth_credentials_activity
  AFTER INSERT OR UPDATE OR DELETE ON auth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION log_activity_trigger();

-- Add comments
COMMENT ON FUNCTION log_activity_trigger IS 'Automatically logs all data modification activities for audit purposes';
