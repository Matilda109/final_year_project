-- Fix permissions and setup for meetings
-- Run this in your Supabase SQL Editor

-- 1. First, verify the tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meetings') THEN
    RAISE EXCEPTION 'meetings table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meeting_participants') THEN
    RAISE EXCEPTION 'meeting_participants table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meeting_requests') THEN
    RAISE EXCEPTION 'meeting_requests table does not exist';
  END IF;
END $$;

-- 2. Disable RLS temporarily to check data
ALTER TABLE public.meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_requests DISABLE ROW LEVEL SECURITY;

-- 3. Grant full access to authenticated users (temporary fix)
GRANT ALL ON public.meetings TO authenticated;
GRANT ALL ON public.meeting_participants TO authenticated;
GRANT ALL ON public.meeting_requests TO authenticated;

-- 4. Add missing permissions for sequences if they exist
DO $$
BEGIN
  EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.meetings_id_seq TO authenticated';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'meetings_id_seq does not exist, skipping';
END $$;

DO $$
BEGIN
  EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.meeting_participants_id_seq TO authenticated';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'meeting_participants_id_seq does not exist, skipping';
END $$;

DO $$
BEGIN
  EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.meeting_requests_id_seq TO authenticated';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'meeting_requests_id_seq does not exist, skipping';
END $$;

-- 5. Re-enable RLS with simplified policies
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Supervisors can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can view meetings they are part of" ON public.meetings;
DROP POLICY IF EXISTS "Supervisors can update their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Supervisors can delete their meetings" ON public.meetings;

DROP POLICY IF EXISTS "Meeting creators can add participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can view their meeting participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Meeting creators can update participants" ON public.meeting_participants;

DROP POLICY IF EXISTS "Students can create meeting requests" ON public.meeting_requests;
DROP POLICY IF EXISTS "Users can view their meeting requests" ON public.meeting_requests;
DROP POLICY IF EXISTS "Supervisors can update meeting requests assigned to them" ON public.meeting_requests;

-- Create simplified policies for meetings
CREATE POLICY "Enable full access for authenticated users" 
  ON public.meetings 
  FOR ALL 
  TO authenticated
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable full access for authenticated users" 
  ON public.meeting_participants 
  FOR ALL 
  TO authenticated
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable full access for authenticated users" 
  ON public.meeting_requests 
  FOR ALL 
  TO authenticated
  USING (true) 
  WITH CHECK (true);

-- 6. Fix any potential issues with the views
DROP VIEW IF EXISTS public.upcoming_meetings_view;
CREATE OR REPLACE VIEW public.upcoming_meetings_view AS
SELECT 
  m.id AS meeting_id,
  m.title,
  m.meeting_type,
  m.date_time,
  m.duration_minutes,
  m.location_type,
  m.location_details,
  m.agenda,
  m.status,
  m.created_by,
  creator.full_name AS created_by_name,
  creator.user_type AS created_by_type,
  mp.participant_id,
  p.full_name AS participant_name,
  p.user_type AS participant_type,
  mp.attendance_status,
  m.created_at,
  m.updated_at
FROM 
  public.meetings m
LEFT JOIN 
  public.meeting_participants mp ON m.id = mp.meeting_id
LEFT JOIN 
  public.profiles p ON mp.participant_id = p.id
LEFT JOIN
  public.profiles creator ON m.created_by = creator.id
WHERE 
  m.status = 'upcoming' AND m.date_time > NOW();

-- Grant access to the views
GRANT SELECT ON public.upcoming_meetings_view TO authenticated;

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS meetings_created_by_idx ON public.meetings(created_by);
CREATE INDEX IF NOT EXISTS meeting_participants_meeting_id_idx ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS meeting_participants_participant_id_idx ON public.meeting_participants(participant_id);
CREATE INDEX IF NOT EXISTS meeting_requests_supervisor_id_idx ON public.meeting_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS meeting_requests_student_id_idx ON public.meeting_requests(student_id); 