-- SUPABASE_ASSESSMENT_DIAGNOSTIC.sql
-- Diagnostic functions to check project assessment data and permissions

-- Function to check if project_assessments table exists and has data
CREATE OR REPLACE FUNCTION check_project_assessments()
RETURNS TABLE (
  table_exists boolean,
  row_count bigint,
  sample_data jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  assessment_exists boolean;
  assessment_count bigint;
  assessment_sample jsonb;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_assessments'
  ) INTO assessment_exists;
  
  -- If table exists, get count and sample
  IF assessment_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM project_assessments' INTO assessment_count;
    
    IF assessment_count > 0 THEN
      EXECUTE 'SELECT to_jsonb(t) FROM (SELECT * FROM project_assessments LIMIT 1) t' INTO assessment_sample;
    ELSE
      assessment_sample := '{"message": "No assessments found"}'::jsonb;
    END IF;
  ELSE
    assessment_count := 0;
    assessment_sample := '{"message": "Table does not exist"}'::jsonb;
  END IF;
  
  RETURN QUERY SELECT assessment_exists, assessment_count, assessment_sample;
END;
$$;

-- Function to check RLS policies on project_assessments
CREATE OR REPLACE FUNCTION check_assessment_policies()
RETURNS TABLE (
  policy_name text,
  policy_action text,
  policy_roles text,
  policy_using text,
  policy_with_check text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.policyname::text,
    p.cmd::text as action,
    p.roles::text,
    p.qual::text as policy_using,
    p.with_check::text
  FROM pg_policies p
  WHERE p.tablename = 'project_assessments'
  AND p.schemaname = 'public';
END;
$$;

-- Function to check if current user can access assessments
CREATE OR REPLACE FUNCTION test_assessment_access()
RETURNS TABLE (
  user_id text,
  user_role text,
  can_select boolean,
  can_insert boolean,
  assessment_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_user_id text;
  current_user_role text;
  can_select_data boolean;
  can_insert_data boolean;
  assessment_count_val bigint;
BEGIN
  -- Get current user info
  current_user_id := auth.uid()::text;
  
  -- Get user role
  SELECT role INTO current_user_role FROM user_roles WHERE user_id = current_user_id LIMIT 1;
  IF current_user_role IS NULL THEN
    current_user_role := 'unknown';
  END IF;
  
  -- Test if user can select from project_assessments
  BEGIN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM project_assessments LIMIT 1)' INTO can_select_data;
    EXCEPTION WHEN OTHERS THEN
      can_select_data := false;
  END;
  
  -- Test if user can insert into project_assessments
  BEGIN
    -- We don't actually insert, just check permissions
    EXECUTE 'SELECT true FROM pg_policies p 
             WHERE p.tablename = ''project_assessments'' 
             AND p.cmd = ''INSERT''
             AND p.schemaname = ''public''
             AND (p.roles = ''{public}'' OR p.roles @> ARRAY[current_role])'
    INTO can_insert_data;
    
    IF can_insert_data IS NULL THEN
      can_insert_data := false;
    END IF;
    
    EXCEPTION WHEN OTHERS THEN
      can_insert_data := false;
  END;
  
  -- Count assessments visible to current user
  BEGIN
    EXECUTE 'SELECT COUNT(*) FROM project_assessments' INTO assessment_count_val;
    EXCEPTION WHEN OTHERS THEN
      assessment_count_val := 0;
  END;
  
  RETURN QUERY SELECT 
    current_user_id, 
    current_user_role, 
    can_select_data, 
    can_insert_data, 
    assessment_count_val;
END;
$$;

-- Function to check if admin role is properly set up
CREATE OR REPLACE FUNCTION check_admin_role_setup()
RETURNS TABLE (
  admin_role_exists boolean,
  admin_users_count bigint,
  admin_users jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  role_exists boolean;
  users_count bigint;
  users_data jsonb;
BEGIN
  -- Check if admin role exists in user_roles table
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  ) INTO role_exists;
  
  IF role_exists THEN
    -- Count admin users
    EXECUTE 'SELECT COUNT(*) FROM user_roles WHERE role = ''admin''' INTO users_count;
    
    -- Get sample admin users
    IF users_count > 0 THEN
      EXECUTE 'SELECT jsonb_agg(ur) FROM (
                SELECT ur.user_id, ur.role, p.full_name 
                FROM user_roles ur
                LEFT JOIN profiles p ON ur.user_id = p.id
                WHERE ur.role = ''admin''
                LIMIT 5
              ) ur' INTO users_data;
    ELSE
      users_data := '{"message": "No admin users found"}'::jsonb;
    END IF;
  ELSE
    users_count := 0;
    users_data := '{"message": "user_roles table does not exist"}'::jsonb;
  END IF;
  
  RETURN QUERY SELECT role_exists, users_count, users_data;
END;
$$;

-- How to use these functions:
-- 1. Check if assessments exist and get a sample:
--    SELECT * FROM check_project_assessments();
--
-- 2. Check RLS policies on the assessments table:
--    SELECT * FROM check_assessment_policies();
--
-- 3. Test if current user can access assessments:
--    SELECT * FROM test_assessment_access();
--
-- 4. Check admin role setup:
--    SELECT * FROM check_admin_role_setup();
