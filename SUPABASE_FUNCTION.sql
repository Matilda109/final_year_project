-- This function needs to be executed in your Supabase SQL editor
-- It creates a function that can bypass RLS for inserting profiles

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
    p_reference_number, -- Use reference_number as the email value
    p_user_type,
    p_department,
    NOW(),
    NOW()
  )
  RETURNING *;
END;
$$; 