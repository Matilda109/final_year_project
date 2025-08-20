# Student-Supervisor Assignment Guide

This guide explains how to set up and use the student-supervisor assignment functionality in the system.

## Database Setup

Before you can use the feature, run the provided SQL script in your Supabase SQL Editor:

1. Navigate to Supabase Dashboard → SQL Editor
2. Open the `SUPABASE_RELATIONSHIPS_SETUP.sql` file from this project
3. Run the entire script

The script sets up:

- `student_supervisor_relationships` table - Stores all relationships between students and supervisors
- `student_supervisor_relationships_view` - A view showing detailed relationship information
- `supervisor_workload_view` - A view showing how many students each supervisor is managing
- Row-Level Security policies - Controls access to relationship data

## Using the Admin Dashboard

### Viewing Relationships

The Relationships tab in the admin dashboard displays:

- Statistics about total relationships, active relationships, and average students per supervisor
- A searchable, filterable table of all student-supervisor relationships
- Status indicators for each relationship (active, inactive, completed)

### Assigning Students to Supervisors

1. Click the "Assign" button in the top right corner
2. Select a student from the dropdown (only unassigned students are shown)
3. Select a supervisor (color-coded indicators show current workload)
4. Optionally add a project title
5. Choose the relationship status (default: active)
6. Click "Create Assignment"

The system prevents duplicate assignments - a student can only have one active supervisor at a time.

### Managing Relationships

You can:

- **Edit Project Title**: Click the action menu (three dots) and select "Edit Project"
- **Change Status**: Use the action menu to mark as active, inactive, or completed
- **Delete Relationship**: Remove the relationship entirely (use with caution)

### Workload Management

The system shows supervisor workload with color indicators:
- 🟢 Green: 1-3 students (light workload)
- 🟡 Yellow: 4-6 students (moderate workload)
- 🔴 Red: 7+ students (heavy workload)

### Searching and Filtering

- Use the search box to find relationships by student name, supervisor name, ID, or project title
- Filter by department or status using the filter button

## Key Features

- **Auto-refreshing lists**: When a student is assigned, they're removed from the available students list
- **Workload indicators**: See at a glance which supervisors have capacity
- **Duplicate prevention**: Students cannot have multiple active supervisors
- **Department matching**: See supervisor departments to match students appropriately
- **Error handling**: Clear feedback when operations fail or validation issues occur

## Best Practices

1. **Balance workloads**: Try to distribute students evenly among supervisors
2. **Match departments**: When possible, assign students to supervisors in the same department
3. **Maintain records**: Add project titles and update statuses to keep accurate records
4. **Regular updates**: Mark completed relationships as "completed" rather than deleting them 