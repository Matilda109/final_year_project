-- This script helps check and fix issues with email constraints in the profiles table

-- 1. Check if there are duplicate emails in the profiles table
SELECT email, COUNT(*) 
FROM profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 2. Check if there are any records with empty email values
SELECT id, reference_number, email 
FROM profiles 
WHERE email = '';

-- 3. Update any empty email values to match their reference_number
-- Execute this if you have records with empty email values
UPDATE profiles
SET email = reference_number
WHERE email = '';

-- 4. You may need to drop and recreate the unique constraint on email
-- Only do this if you're still having issues after running steps 1-3
-- ALTER TABLE profiles DROP CONSTRAINT profiles_email_key;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- 5. If you prefer to remove the unique constraint entirely (not recommended unless needed)
-- ALTER TABLE profiles DROP CONSTRAINT profiles_email_key;

-- 6. Verify the SQL function exists and is working
SELECT pg_get_functiondef('public.insert_profile_direct'::regproc); 