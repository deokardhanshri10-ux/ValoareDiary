-- Instructions to create your first admin user
-- Run this SQL in the Supabase SQL Editor

-- STEP 1: Create an organisation
-- Replace 'Your Organisation Name' and 'admin@yourcompany.com' with your actual values
INSERT INTO organisations (name, email)
VALUES ('Your Organisation Name', 'admin@yourcompany.com')
RETURNING id;
-- Note the organisation ID returned from this query

-- STEP 2: Create the first admin user
-- Replace the values below:
-- - 'org-id-from-step-1' with the actual UUID from STEP 1
-- - 'admin@yourcompany.com' with the admin email
-- - 'admin' with your desired username
-- - 'YourSecurePassword123!' with your desired password

SELECT create_user_with_credentials(
  'admin@yourcompany.com',  -- Email (can be temporary)
  'admin',                   -- Username (this is what the user will use to login)
  'YourSecurePassword123!',  -- Password (change this!)
  'org-id-from-step-1'::uuid, -- Organisation ID from STEP 1
  'manager'                  -- Role (manager or staff)
);

-- EXAMPLE USAGE:
-- Let's say the organisation ID returned was: '550e8400-e29b-41d4-a716-446655440000'
-- Then you would run:

-- SELECT create_user_with_credentials(
--   'john@example.com',
--   'johndoe',
--   'SecurePass123!',
--   '550e8400-e29b-41d4-a716-446655440000'::uuid,
--   'manager'
-- );

-- After creating the first manager user, that user can log in to the app
-- and create additional users through the "Manage Users" interface.
