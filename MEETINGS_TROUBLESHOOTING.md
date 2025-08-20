# Meeting System Troubleshooting Guide

## Common Issues and Solutions

### 1. Error: "Failed to schedule meeting"

**Problem:** When trying to schedule a meeting, you receive an error message.

**Solutions:**
- Check the browser console (F12) for detailed error messages
- Verify that all required fields are filled in correctly
- Make sure the selected date and time are valid
- Ensure that at least one student is selected
- Check that your user has the correct permissions (supervisor role)

### 2. Meeting Data Not Loading

**Problem:** Meeting data doesn't appear in the dashboard.

**Solutions:**
- Refresh the page
- Check if you're logged in correctly
- Verify that the Supabase connection is working
- Check if the SQL tables and views were created correctly

### 3. Student Not Appearing in Selection

**Problem:** A student doesn't appear in the dropdown when scheduling a meeting.

**Solutions:**
- Verify that the student is properly assigned to you in the student_supervisor_relationships table
- Check that the relationship status is 'active'
- Ensure the student's account has the 'student' user type

### 4. Meeting Request Not Showing for Supervisor

**Problem:** A student submitted a meeting request, but it's not showing up for the supervisor.

**Solutions:**
- Check that the request was submitted with the correct supervisor_id
- Verify that the request status is 'pending'
- Refresh the supervisor's dashboard

### 5. Date/Time Format Issues

**Problem:** Meeting times display incorrectly or cause errors when saving.

**Solutions:**
- Make sure you're using the correct date format (YYYY-MM-DD)
- Check that time values are in 24-hour format (HH:MM)
- Ensure the browser's timezone settings are correct

## Database Troubleshooting

### 1. Check Table Creation

Run these queries to verify that all tables were created correctly:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('meetings', 'meeting_participants', 'meeting_requests');
```

### 2. Check View Creation

Verify that all views were created:

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (
  'upcoming_meetings_view', 
  'supervisor_meetings_view', 
  'student_meetings_view',
  'todays_meetings_count',
  'this_week_meetings_count',
  'meeting_requests_count'
);
```

### 3. Check Relationships

Verify student-supervisor relationships:

```sql
SELECT * FROM student_supervisor_relationships_view 
WHERE status = 'active' 
AND (student_id = 'YOUR_STUDENT_ID' OR supervisor_id = 'YOUR_SUPERVISOR_ID');
```

## Frontend Debugging

### 1. Debug Meeting Creation

Add these console logs to debug meeting creation:

```javascript
console.log("Meeting data:", {
  title: meetingTitle,
  meeting_type: meetingType,
  date_time: dateTime.toISOString(),
  duration_minutes: parseInt(meetingDuration),
  location_type: locationType,
  created_by: user.id,
  participants: selectedStudents
});
```

### 2. Check User Authentication

Verify that the user is properly authenticated:

```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log("Current user:", user);
```

### 3. Verify Data Fetching

Debug data fetching issues:

```javascript
const { data, error } = await supabase
  .from('upcoming_meetings_view')
  .select('*');
console.log("Meetings data:", data);
console.log("Fetch error:", error);
```

## Recent Fixes

We've recently fixed the following issues:

1. Fixed the `createMeeting` function to properly handle errors and return more detailed error messages
2. Updated the meeting scheduling form to provide better error feedback
3. Fixed the Calendar component in the student meeting request form
4. Added additional debugging information to help identify issues

If you continue experiencing problems after trying these solutions, please report the issue with:
1. The specific error message from the browser console
2. Steps to reproduce the issue
3. User role (student, supervisor, admin)
4. Browser and device information 