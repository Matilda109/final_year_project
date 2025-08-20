# Meeting System Setup Guide

This guide explains how to set up and use the meeting functionality between supervisors and students.

## Database Setup

1. Run the SQL script in `SUPABASE_MEETINGS_SETUP.sql` in your Supabase SQL Editor to create the necessary tables and views.

```sql
-- Run the entire SQL script in SUPABASE_MEETINGS_SETUP.sql
```

## Features Implemented

### For Supervisors

1. **View Meeting Statistics**
   - Today's meetings count (total, completed, upcoming)
   - This week's meetings count (total, scheduled, pending)
   - Meeting requests count

2. **Schedule Meetings**
   - Create individual or group meetings
   - Select students assigned to the supervisor
   - Set date, time, duration, and location
   - Add meeting agenda

3. **Manage Meeting Requests**
   - View pending meeting requests from students
   - Approve or reject requests
   - View request details including preferred date/time

4. **View Upcoming Meetings**
   - Filter meetings by type or location
   - See meeting details (participant, time, location)
   - Join virtual meetings or manage in-person meetings

### For Students

1. **Request Meetings**
   - Request meetings with their assigned supervisor
   - Set preferred date and time
   - Add meeting title and description

2. **View Upcoming Meetings**
   - See all scheduled meetings
   - View meeting details (date, time, location, status)
   - Track meeting status (pending, confirmed, etc.)

3. **View Meeting History**
   - See past meetings
   - View meeting details and agendas

## How It Works

### Meeting Flow

1. **Supervisor Schedules Meeting**:
   - Supervisor creates a meeting and selects student(s)
   - Meeting is added to the database with "upcoming" status
   - Students can see the meeting in their dashboard

2. **Student Requests Meeting**:
   - Student submits a meeting request with preferred date/time
   - Request appears in supervisor's dashboard
   - Supervisor can approve or reject the request
   - If approved, a new meeting is created

### Data Structure

- `meetings`: Stores meeting details (title, date, location, etc.)
- `meeting_participants`: Links meetings to participants (many-to-many)
- `meeting_requests`: Stores student meeting requests

### Views

- `upcoming_meetings_view`: Shows upcoming meetings with participant details
- `supervisor_meetings_view`: Shows supervisor's meetings with participant count
- `student_meetings_view`: Shows meetings from a student's perspective
- `todays_meetings_count`: Counts today's meetings for dashboard stats
- `this_week_meetings_count`: Counts this week's meetings for dashboard stats
- `meeting_requests_count`: Counts pending meeting requests

## Customization

You can customize the meeting system by:

1. Adding more meeting types in the `meeting_type` check constraint
2. Adding notification functionality when meetings are created or updated
3. Implementing calendar integration for automatic reminders
4. Adding video conferencing integration for virtual meetings

## Troubleshooting

If you encounter issues:

1. Check that all SQL tables and views were created successfully
2. Verify that the supervisor-student relationships are properly set up
3. Check browser console for any JavaScript errors
4. Ensure Supabase connection is working properly 