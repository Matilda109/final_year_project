# Project Deadlines Setup

This document outlines the setup for the project deadlines feature in the system.

## Database Schema

The project deadlines feature uses the `project_deadlines` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS public.project_deadlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_type TEXT NOT NULL,
    deadline_date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    supervisor_id UUID NOT NULL REFERENCES public.profiles(id),
    student_id UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## Key Fields

- `project_type`: The type of project milestone (proposal, literature, methodology, implementation, thesis)
- `deadline_date`: The date by which the milestone must be submitted
- `description`: Optional additional instructions or requirements
- `supervisor_id`: The supervisor who set the deadline
- `student_id`: If specified, the deadline applies only to this student. If NULL, it applies to all students supervised by the supervisor
- `status`: Can be 'active', 'expired', or 'cancelled'

## Row Level Security Policies

The following RLS policies are applied:

1. Supervisors can create deadlines
2. Supervisors can view, update, and delete their own deadlines
3. Students can view deadlines that are either:
   - Specifically assigned to them
   - General deadlines (student_id is NULL) set by their supervisor

## Usage

### Supervisors

Supervisors can set deadlines for:
- All their students (by leaving student_id as NULL)
- A specific student (by setting student_id)

Deadlines appear in the supervisor dashboard under "Project Submission Deadlines".

### Students

Students can view deadlines in their dashboard under "Upcoming Deadlines". The system shows:
- Deadlines specifically assigned to them
- General deadlines set by their supervisor

Deadlines are color-coded based on urgency:
- Red: Due within 3 days
- Amber: Due within 7 days
- Blue: Due in more than 7 days

## Implementation Notes

The system calculates days until the deadline and displays appropriate urgency indicators. Overdue deadlines are marked separately.

## Related Files

- `src/app/admin/supervisordashboard/components/pages/meetings.tsx` - Supervisor deadline management
- `src/app/admin/supervisordashboard/lib/data.ts` - Data fetching functions
- `src/app/admin/studentdashboard/components/tabs/dashboard-tab.tsx` - Student deadline display
- `SUPABASE_PROJECTS_SETUP.sql` - SQL setup for the deadlines table 