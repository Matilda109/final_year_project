-- Fix for infinite recursion in RLS policies for meetings table
-- Run this in your Supabase SQL Editor

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view meetings they are part of" ON public.meetings;
DROP POLICY IF EXISTS "Supervisors can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Supervisors can update their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Supervisors can delete their meetings" ON public.meetings;

-- Create fixed policies with better conditions that avoid recursion

-- Policy for viewing meetings
CREATE POLICY "Users can view meetings they are part of" 
  ON public.meetings 
  FOR SELECT 
  USING (
    -- Check if user is a participant (without using a subquery that references the same table)
    EXISTS (
      SELECT 1 FROM public.meeting_participants 
      WHERE meeting_id = id AND participant_id = auth.uid()
    ) OR 
    -- Check if user created the meeting
    created_by = auth.uid() OR
    -- Check if user is admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Policy for inserting meetings (for supervisors)
CREATE POLICY "Supervisors can create meetings" 
  ON public.meetings 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'supervisor'
    )
  );

-- Policy for updating meetings
CREATE POLICY "Supervisors can update their meetings" 
  ON public.meetings 
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Policy for deleting meetings
CREATE POLICY "Supervisors can delete their meetings" 
  ON public.meetings 
  FOR DELETE 
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Also fix the meeting_participants policies to avoid potential recursion
DROP POLICY IF EXISTS "Meeting creators can add participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can view their meeting participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Meeting creators can update participants" ON public.meeting_participants;

-- Create fixed policies for meeting_participants
CREATE POLICY "Meeting creators can add participants" 
  ON public.meeting_participants 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Users can view their meeting participants" 
  ON public.meeting_participants 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    ) OR 
    participant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Meeting creators can update participants" 
  ON public.meeting_participants 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  ); 