# Supabase Admin Setup Guide

This guide explains how to set up your Supabase project to bypass Row-Level Security (RLS) for admin operations.

## Understanding the Issue

When you encounter the error:

```
new row violates row-level security policy for table "profiles"
```

It means your application is trying to insert data into the profiles table, but the Row-Level Security (RLS) policies are preventing it.

## Solution Options

You have three options to resolve this issue:

### Option 1: Use a Service Role Key (Requires Server-Side Code)

This approach works but should only be used in server-side code (not client-side):

1. **Get your service role key:**
   - Go to your [Supabase project dashboard](https://app.supabase.com)
   - Navigate to Settings > API
   - Under "Project API keys", find and copy the "service_role" key

2. **Add to environment variables:**
   - Create or edit `.env.local` file (not .env.local.txt or .envo.local)
   - Add the following line:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Restart your Next.js development server**:
   ```bash
   npm run dev
   ```

### Option 2: Update RLS Policies (Simpler Solution)

Modify the RLS policies to allow inserts from authenticated users:

1. **Go to your Supabase project dashboard**
2. **Navigate to Database > Tables**
3. **Select the "profiles" table**
4. **Go to the "Policies" tab**
5. **Add a new policy for INSERT operations**:
   - Name: "Enable insert for authenticated users"
   - Operation: INSERT
   - Policy definition: `auth.uid() = id OR auth.uid() IN (SELECT id FROM profiles WHERE user_type = 'admin')`
   - This allows users to insert their own profile data or admins to insert anyone's profile

### Option 3: Create a Database Function (Recommended for Client-Side)

This is the most secure approach for client-side code:

1. **Go to your Supabase project dashboard**
2. **Navigate to SQL Editor**
3. **Create a new query**
4. **Copy and paste the SQL from `SUPABASE_FUNCTION.sql`** (or copy below):

```sql
-- Create a function to directly insert a profile (bypassing RLS)
CREATE OR REPLACE FUNCTION public.insert_profile_direct(
  p_id UUID,
  p_full_name TEXT,
  p_reference_number TEXT,
  p_user_type TEXT,
  p_department TEXT
) 
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the privileges of the function creator
AS $$
BEGIN
  -- Insert the profile and return the inserted row
  RETURN QUERY
  INSERT INTO public.profiles (
    id, 
    full_name, 
    reference_number, 
    email,
    user_type, 
    department,
    created_at,
    updated_at
  ) 
  VALUES (
    p_id,
    p_full_name,
    p_reference_number,
    '', -- email field set to empty string
    p_user_type,
    p_department,
    NOW(),
    NOW()
  )
  RETURNING *;
END;
$$;
```

5. **Run the SQL query** to create the function
6. The code has already been updated to try using this function when regular inserts fail

## Final Solution

The recommended approach is to:

1. **First try Option 3** (create the SQL function) - this allows secure bypass of RLS
2. **If that doesn't work, try Option 2** (update RLS policies)
3. **As a last resort, use Option 1** (service role key) but only if you move user creation to API routes

## Checking If It Works

After implementing any solution:

1. Try creating a user again through your admin interface
2. Check the Supabase authentication console to verify the user is created
3. Check the Supabase database to verify the profile record is created
4. Check your browser console for detailed error information

## Troubleshooting

If you're still encountering issues:

1. Look at the browser console for detailed error messages - we've added additional logging
2. Try each solution option in order
3. Verify the SQL function exists in your database
4. Check if there are any other constraints on your profiles table

For more information, refer to the [Supabase documentation on Row Level Security](https://supabase.com/docs/guides/auth/row-level-security). 