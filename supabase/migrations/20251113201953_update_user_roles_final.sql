/*
  # Update User Roles

  1. Changes
    - Update existing users to new role values
    - Drop old 'valid_role' check constraint on user_profiles
    - Add new role check constraint with three roles:
      - manager: Full access to create/edit/delete and manage users
      - associate-editor: Can create and edit content but cannot manage users
      - associate-viewer: Read-only access, cannot create or edit content

  2. Notes
    - Existing 'staff' role users are converted to 'associate-editor'
    - Existing 'manager' users remain as 'manager'
*/

-- Step 1: Drop the constraint first
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS valid_role;

-- Step 2: Update existing data
UPDATE user_profiles
SET role = 'associate-editor'
WHERE role = 'staff';

-- Step 3: Add new constraint
ALTER TABLE user_profiles
ADD CONSTRAINT valid_role
CHECK (role IN ('manager', 'associate-editor', 'associate-viewer'));
