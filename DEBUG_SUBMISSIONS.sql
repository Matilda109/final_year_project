-- Debug script to check submissions and supervisor relationships
-- Run this in Supabase SQL Editor to debug the submission visibility issue

-- ============================================================================
-- 1. CHECK ALL PROJECT SUBMISSIONS
-- ============================================================================

-- Check all project submissions and their status
SELECT 
  ps.id,
  ps.student_id,
  ps.title,
  ps.project_type,
  ps.status,
  ps.submitted_at,
  p.full_name as student_name,
  p.reference_number
FROM project_submissions ps
LEFT JOIN profiles p ON ps.student_id = p.id
ORDER BY ps.submitted_at DESC
LIMIT 20;

-- ============================================================================
-- 2. CHECK SUPERVISOR-STUDENT RELATIONSHIPS
-- ============================================================================

-- Check individual supervisor-student relationships
SELECT 
  'individual' as assignment_type,
  ssr.supervisor_id,
  ssr.student_id,
  ssr.status,
  s.full_name as supervisor_name,
  st.full_name as student_name
FROM student_supervisor_relationships_view ssr
LEFT JOIN profiles s ON ssr.supervisor_id = s.id
LEFT JOIN profiles st ON ssr.student_id = st.id
WHERE ssr.status = 'active'
ORDER BY s.full_name;

-- Check group assignments
SELECT 
  'group' as assignment_type,
  sg.supervisor_id,
  gm.student_id,
  sg.status,
  s.full_name as supervisor_name,
  st.full_name as student_name,
  sg.name as group_name
FROM student_groups sg
JOIN group_members gm ON sg.id = gm.group_id
LEFT JOIN profiles s ON sg.supervisor_id = s.id
LEFT JOIN profiles st ON gm.student_id = st.id
WHERE sg.status = 'active'
ORDER BY s.full_name, sg.name;

-- ============================================================================
-- 3. CHECK SUBMISSIONS FOR SPECIFIC SUPERVISOR
-- ============================================================================

-- Replace 'SUPERVISOR_ID_HERE' with actual supervisor ID
-- Check submissions from individually assigned students
SELECT 
  'individual' as source,
  ps.id,
  ps.student_id,
  ps.title,
  ps.project_type,
  ps.status,
  ps.submitted_at,
  p.full_name as student_name
FROM project_submissions ps
JOIN profiles p ON ps.student_id = p.id
WHERE ps.student_id IN (
  SELECT student_id 
  FROM student_supervisor_relationships_view 
  WHERE supervisor_id = 'SUPERVISOR_ID_HERE' 
    AND status = 'active'
)
ORDER BY ps.submitted_at DESC;

-- Check submissions from group-assigned students
SELECT 
  'group' as source,
  ps.id,
  ps.student_id,
  ps.title,
  ps.project_type,
  ps.status,
  ps.submitted_at,
  p.full_name as student_name,
  sg.name as group_name
FROM project_submissions ps
JOIN profiles p ON ps.student_id = p.id
JOIN group_members gm ON ps.student_id = gm.student_id
JOIN student_groups sg ON gm.group_id = sg.id
WHERE sg.supervisor_id = 'SUPERVISOR_ID_HERE'
  AND sg.status = 'active'
ORDER BY ps.submitted_at DESC;

-- ============================================================================
-- 4. CHECK TABLE STRUCTURE
-- ============================================================================

-- Check if project_submissions table exists and its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'project_submissions'
ORDER BY ordinal_position;

-- Check if the foreign key relationship exists
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'project_submissions';

-- ============================================================================
-- 5. TEST THE ACTUAL QUERY FROM getPendingFeedbackSubmissions
-- ============================================================================

-- Test individual submissions query (replace SUPERVISOR_ID_HERE)
WITH individual_students AS (
  SELECT student_id
  FROM student_supervisor_relationships_view
  WHERE supervisor_id = 'SUPERVISOR_ID_HERE'
    AND status = 'active'
)
SELECT 
  ps.id,
  ps.student_id,
  ps.title,
  ps.project_type,
  ps.status,
  ps.submitted_at,
  ps.file_url,
  ps.description,
  p.full_name,
  p.reference_number
FROM project_submissions ps
LEFT JOIN profiles p ON ps.student_id = p.id
WHERE ps.student_id IN (SELECT student_id FROM individual_students)
  AND ps.status = 'pending'
ORDER BY ps.submitted_at DESC;

-- Test group submissions query (replace SUPERVISOR_ID_HERE)
WITH group_students AS (
  SELECT DISTINCT gm.student_id
  FROM student_groups sg
  JOIN group_members gm ON sg.id = gm.group_id
  WHERE sg.supervisor_id = 'SUPERVISOR_ID_HERE'
    AND sg.status = 'active'
)
SELECT 
  ps.id,
  ps.student_id,
  ps.title,
  ps.project_type,
  ps.status,
  ps.submitted_at,
  ps.file_url,
  ps.description,
  p.full_name,
  p.reference_number
FROM project_submissions ps
LEFT JOIN profiles p ON ps.student_id = p.id
WHERE ps.student_id IN (SELECT student_id FROM group_students)
  AND ps.status = 'pending'
ORDER BY ps.submitted_at DESC;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================

/*
TO USE THIS DEBUG SCRIPT:

1. Replace 'SUPERVISOR_ID_HERE' with the actual supervisor ID you're testing with
2. Run each section separately to identify the issue
3. Check the results to see:
   - Are there any submissions in the database?
   - What status do they have? (might be 'submitted' instead of 'pending')
   - Are the supervisor-student relationships set up correctly?
   - Do the foreign key relationships work?

COMMON ISSUES:
- Submissions might have status 'submitted' instead of 'pending'
- Foreign key relationship might be broken
- Supervisor-student relationships might not be active
- Group assignments might not be properly set up

NEXT STEPS:
- If submissions exist but have different status, update the query
- If relationships are missing, check the admin dashboard setup
- If foreign keys are broken, check table structure
*/
