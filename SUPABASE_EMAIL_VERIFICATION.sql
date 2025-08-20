-- This SQL script creates a function to auto-verify user emails in Supabase
-- Run this in your Supabase SQL Editor

-- Function to verify a user's email by their user ID
CREATE OR REPLACE FUNCTION public.admin_verify_user_email(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the privileges of the function creator
AS $$
DECLARE
  email_verified BOOLEAN;
BEGIN
  -- Update the auth.users table to set email_confirmed_at to current timestamp
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = user_id
  RETURNING (email_confirmed_at IS NOT NULL) INTO email_verified;
  
  RETURN email_verified;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_verify_user_email(UUID) TO authenticated;

-- Function to check if a user's email is verified
CREATE OR REPLACE FUNCTION public.is_user_email_verified(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_verified BOOLEAN;
BEGIN
  -- Check if the user's email is confirmed
  SELECT (email_confirmed_at IS NOT NULL)
  INTO is_verified
  FROM auth.users
  WHERE id = user_id;
  
  RETURN is_verified;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_email_verified(UUID) TO authenticated; 