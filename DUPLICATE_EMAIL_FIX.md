# Fixing Duplicate Email Constraint Error in Supabase Profiles

## The Problem

You encountered an error when adding users through the admin dashboard:

```
Failed to create profile using all methods. Error details:
["code":"23505" "details"."Key (email)= (email)=0 already exists." "hint": null, "message"."duplicate key value violates unique constraint \"profiles_email_key\""]
```

This error occurs because:

1. The `profiles` table has a unique constraint on the `email` column
2. When adding a new user, the system was trying to use an email that already exists in the database
3. Previously, we were setting the `email` field to an empty string, but Supabase treats empty strings as unique values in unique constraints (only one record can have an empty string)

## The Solution

We've made two key changes to fix this issue:

1. **Modified the SQL Function:** Updated the `insert_profile_direct` function to use the reference number as both the reference number AND email value:

```sql
CREATE OR REPLACE FUNCTION public.insert_profile_direct(
  -- parameters
) 
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.profiles (
    -- other fields
    reference_number, 
    email,
    -- other fields
  ) 
  VALUES (
    -- other values
    p_reference_number,
    p_reference_number, -- Using reference_number as the email value
    -- other values
  )
  RETURNING *;
END;
$$; 
```

2. **Updated the Admin Dashboard:** Modified the user creation code to:
   - Use the same email value for both reference_number and email fields
   - Added specific error handling for duplicate email constraint violations
   - Improved error messages to be more descriptive

## How to Test

1. Log in to the admin dashboard
2. Add a new user with a unique email address
3. Verify that the user is created successfully in both Supabase Authentication and the profiles table
4. Try to add another user with the same email - you should now get a clear error message

## If You Still Have Issues

If you continue to encounter problems:

1. Check the Supabase schema to verify the profiles table structure
2. Run the SQL function update in your Supabase SQL editor
3. Make sure your `.env.local` file has the correct Supabase configuration
4. Review your browser console for any additional error details 