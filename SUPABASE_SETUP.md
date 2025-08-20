# Supabase Login Troubleshooting Guide

If you're having issues logging in with your Supabase credentials, follow these steps to resolve the problem:

## 1. Set Up Environment Variables

Create a `.env.local` file in your project root (or edit if it already exists) with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-dashboard
```

You can find these values in your Supabase dashboard:
- Go to Project Settings > API
- Copy the URL and anon/public key

## 2. Verify Users in Supabase Auth

1. In your Supabase dashboard, go to **Authentication > Users**
2. Make sure your users exist with the correct email format: `referenceNumber@school.edu`
3. If needed, create test users:
   - Click "Add User"
   - Set Email to: `STUD001@school.edu` (for students) or `SUPER001@school.edu` (for supervisors)
   - Set Password to match the reference number (e.g., `STUD001`)

## 3. Set Up Database Schema

Ensure your `profiles` table is correctly set up:

1. In Supabase, go to **Table Editor**
2. Create a `profiles` table (if not already created) with these columns:
   - `id` (UUID, Primary Key, References auth.users.id)
   - `reference_number` (Text, Not Null, Unique)
   - `user_type` (Text, Not Null) - Should be 'student' or 'supervisor'
   - `full_name` (Text)
   - `email` (Text)
   - `department` (Text)
   - `created_at` (Timestamptz, Default: now())
   - `updated_at` (Timestamptz, Default: now())

3. Run this SQL in the SQL Editor to create the table:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  reference_number TEXT UNIQUE NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'supervisor')),
  full_name TEXT,
  email TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 4. Insert Profile Records

After creating users in Auth, you need to create corresponding records in the profiles table:

1. Find the UUID of your users from Authentication > Users
2. Run this SQL to insert profiles (replace UUIDs with actual values):

```sql
INSERT INTO profiles (id, reference_number, user_type, full_name, department)
VALUES 
  ('actual-uuid-from-auth-user', 'STUD001', 'student', 'John Smith', 'Computer Science'),
  ('another-uuid-from-auth-user', 'SUPER001', 'supervisor', 'Dr. Robert Chen', 'Computer Science');
```

## 5. Common Issues & Solutions

### Issue 1: Authentication Error
- Make sure the password entered matches the one in Supabase Auth
- Check that the email format is correct: `referenceNumber@school.edu`

### Issue 2: Profile Not Found
- Make sure there's a record in the `profiles` table that matches the user's UUID
- Verify the `reference_number` field in the profiles table matches what the user enters

### Issue 3: Invalid User Type
- Make sure the `user_type` in the profiles table is exactly 'student' or 'supervisor' (case sensitive)

### Issue 4: Environment Variables Not Loading
- After adding/changing .env.local, restart your development server
- Check that the variables are correctly named (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

## 6. Testing Login

The updated login page includes developer tools (in development mode) to help test:
- Click "Test Student Login" to pre-fill with STUD001
- Click "Test Supervisor Login" to pre-fill with SUPER001

Enter the corresponding password and check the debug info that appears when you try to login.

# Fixing "Invalid login credentials" Error

You're seeing the error: `AuthApiError: Invalid login credentials` because Supabase can't find a user that matches the credentials you're providing. Follow these steps to fix it:

## 1. Check Your Supabase Auth Users

First, verify that users exist in your Supabase Auth system:

1. Go to your Supabase dashboard > Authentication > Users
2. Check if users exist with the email format: `referenceNumber@umat.edu.gh`
   - For example: `STUD001@umat.edu.gh` for students
   - Or `SUPER001@umat.edu.gh` for supervisors

If no users exist, create them:

1. Click "Add User" in the Supabase dashboard
2. Enter the email in the format: `referenceNumber@umat.edu.gh`
3. Enter the password (for testing, use the same reference number as the password)

## 2. Fix Environment Variables

Make sure your Supabase connection details are correct:

1. Create a `.env.local` file in your project root with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-dashboard
```

2. Get these values from your Supabase dashboard > Settings > API
3. **IMPORTANT:** After adding/changing this file, RESTART your development server

## 3. Test Authentication Only

To verify if the authentication part works:

1. Open your browser console (F12)
2. Run this code to test authentication directly:

```javascript
const { createClient } = supabase;
const testSupabase = createClient(
  'your-supabase-url',
  'your-anon-key'
);

testSupabase.auth.signInWithPassword({
  email: 'STUD001@umat.edu.gh',
  password: 'STUD001'
})
.then(response => console.log('Auth response:', response))
.catch(error => console.error('Auth error:', error));
```

## 4. Verify the Email Format

You've updated the code to use `@umat.edu.gh` domain. Make sure:

1. Users in Supabase Auth have emails with the EXACT SAME domain
2. The reference number in the login form exactly matches the reference number part of the email

## 5. Create Test Users via SQL

If the UI doesn't work, you can create users directly with SQL:

1. Go to Supabase SQL Editor
2. Run the following commands to create a test user:

```sql
-- Step 1: Insert into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'STUD001@umat.edu.gh',
  crypt('STUD001', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- Step 2: Take the returned ID and use it to create a profile
-- Replace 'returned-uuid-here' with the UUID from the previous query
INSERT INTO public.profiles (id, reference_number, user_type, full_name, department)
VALUES ('returned-uuid-here', 'STUD001', 'student', 'Test Student', 'Computer Science');
```

## 6. Additional Debug Steps

1. Make sure you entered the same password during login as the one stored in Supabase Auth
2. Check browser console for any CORS errors that might prevent API calls
3. Try disabling browser extensions that might interfere with API requests
4. Make sure your database is in the same region as your application for best performance

After making these changes, restart your Next.js server and try logging in again with the correct credentials. 