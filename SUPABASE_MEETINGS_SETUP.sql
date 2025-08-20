-- This SQL script sets up the meetings and meeting requests tables
-- Run this in your Supabase SQL Editor

-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('individual', 'group', 'workshop')),
  date_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('virtual', 'office', 'custom')),
  location_details TEXT,
  agenda TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meeting participants table (for many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.profiles(id),
  attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'confirmed', 'declined', 'attended', 'absent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, participant_id)
);

-- Create meeting requests table
CREATE TABLE IF NOT EXISTS public.meeting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  meeting_id UUID REFERENCES public.meetings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create views to make querying easier

-- View for upcoming meetings with participant details
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
JOIN 
  public.meeting_participants mp ON m.id = mp.meeting_id
JOIN 
  public.profiles p ON mp.participant_id = p.id
JOIN
  public.profiles creator ON m.created_by = creator.id
WHERE 
  m.status = 'upcoming' AND m.date_time > NOW()
ORDER BY 
  m.date_time ASC;

-- View for supervisor's meetings
CREATE OR REPLACE VIEW public.supervisor_meetings_view AS
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
  COUNT(mp.participant_id) AS participant_count,
  m.created_at,
  m.updated_at
FROM 
  public.meetings m
JOIN 
  public.profiles creator ON m.created_by = creator.id
LEFT JOIN 
  public.meeting_participants mp ON m.id = mp.meeting_id
WHERE 
  creator.user_type = 'supervisor'
GROUP BY 
  m.id, m.title, m.meeting_type, m.date_time, m.duration_minutes, 
  m.location_type, m.location_details, m.agenda, m.status, 
  m.created_by, creator.full_name, m.created_at, m.updated_at;

-- View for student's meetings
CREATE OR REPLACE VIEW public.student_meetings_view AS
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
  creator.full_name AS supervisor_name,
  mp.participant_id AS student_id,
  mp.attendance_status,
  m.created_at,
  m.updated_at
FROM 
  public.meetings m
JOIN 
  public.meeting_participants mp ON m.id = mp.meeting_id
JOIN 
  public.profiles creator ON m.created_by = creator.id
WHERE 
  creator.user_type = 'supervisor' AND mp.participant_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_type = 'student'
  );

-- Create counter views for dashboard statistics

-- View for today's meetings count
CREATE OR REPLACE VIEW public.todays_meetings_count AS
SELECT 
  created_by AS supervisor_id,
  COUNT(*) AS total,
  COUNT(CASE WHEN date_time < NOW() THEN 1 END) AS completed,
  COUNT(CASE WHEN date_time > NOW() THEN 1 END) AS upcoming
FROM 
  public.meetings
WHERE 
  DATE(date_time) = CURRENT_DATE
GROUP BY 
  created_by;

-- View for this week's meetings count
CREATE OR REPLACE VIEW public.this_week_meetings_count AS
SELECT 
  created_by AS supervisor_id,
  COUNT(*) AS total,
  COUNT(CASE WHEN status = 'upcoming' THEN 1 END) AS scheduled,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending
FROM 
  public.meetings
WHERE 
  date_time BETWEEN 
    DATE_TRUNC('week', NOW()) AND 
    DATE_TRUNC('week', NOW()) + INTERVAL '6 days 23 hours 59 minutes 59 seconds'
GROUP BY 
  created_by;

-- View for meeting requests count
CREATE OR REPLACE VIEW public.meeting_requests_count AS
SELECT 
  supervisor_id,
  COUNT(*) AS total
FROM 
  public.meeting_requests
WHERE 
  status = 'pending'
GROUP BY 
  supervisor_id;

-- Add RLS policies
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;

-- Meetings table policies
CREATE POLICY "Supervisors can create meetings" 
  ON public.meetings 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'supervisor'
    )
  );

CREATE POLICY "Users can view meetings they are part of" 
  ON public.meetings 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT participant_id FROM public.meeting_participants WHERE meeting_id = id
    ) OR 
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

CREATE POLICY "Supervisors can update their meetings" 
  ON public.meetings 
  FOR UPDATE 
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

CREATE POLICY "Supervisors can delete their meetings" 
  ON public.meetings 
  FOR DELETE 
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

-- Meeting participants table policies
CREATE POLICY "Meeting creators can add participants" 
  ON public.meeting_participants 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.meetings WHERE id = meeting_id
    ) OR 
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

CREATE POLICY "Users can view their meeting participants" 
  ON public.meeting_participants 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT created_by FROM public.meetings WHERE id = meeting_id
    ) OR 
    auth.uid() = participant_id OR
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

CREATE POLICY "Meeting creators can update participants" 
  ON public.meeting_participants 
  FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT created_by FROM public.meetings WHERE id = meeting_id
    ) OR 
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

-- Meeting requests table policies
CREATE POLICY "Students can create meeting requests" 
  ON public.meeting_requests 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = student_id AND
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'student'
    )
  );

CREATE POLICY "Users can view their meeting requests" 
  ON public.meeting_requests 
  FOR SELECT 
  USING (
    auth.uid() = student_id OR 
    auth.uid() = supervisor_id OR
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

CREATE POLICY "Supervisors can update meeting requests assigned to them" 
  ON public.meeting_requests 
  FOR UPDATE 
  USING (
    auth.uid() = supervisor_id OR
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

-- Grant access to the views
GRANT SELECT ON public.upcoming_meetings_view TO authenticated;
GRANT SELECT ON public.supervisor_meetings_view TO authenticated;
GRANT SELECT ON public.student_meetings_view TO authenticated;
GRANT SELECT ON public.todays_meetings_count TO authenticated;
GRANT SELECT ON public.this_week_meetings_count TO authenticated;
GRANT SELECT ON public.meeting_requests_count TO authenticated; 