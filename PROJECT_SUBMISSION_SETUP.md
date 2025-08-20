# Project Submission System Setup Guide

This guide will help you set up the project submission system in your Supabase project.

## Prerequisites

- A Supabase project with authentication set up
- The `profiles` table already created
- The `student_supervisor_relationships` table already created

## Setup Steps

### 1. Create the Project Submissions Table

Run the SQL script in `SUPABASE_PROJECT_SUBMISSIONS.sql` in your Supabase SQL Editor. This will:

- Create the `project_submissions` table
- Set up Row Level Security (RLS) policies
- Create views for easier querying

### 2. Set Up Storage for Project Documents

#### IMPORTANT: Create the Storage Bucket Manually First

Before running any SQL scripts for storage, you must create the storage bucket manually:

1. Go to the Storage section in your Supabase dashboard
2. Click "New Bucket"
3. Enter the name `project-documents` (must be exactly this name)
4. Check "Public bucket" to make files publicly accessible
5. Click "Create bucket"

After creating the bucket manually, you can optionally run the `SUPABASE_PROJECT_STORAGE_SETUP.sql` script to set up the RLS policies and triggers. However, the manual bucket creation is the most important step.

#### Set RLS Policies for Storage

Ensure these policies are set for your storage bucket:

1. Go to the Authentication > Policies section in your Supabase dashboard
2. Find the `storage.objects` table
3. Add the following policies if they don't exist:
   - Policy for SELECT (anyone can view): `bucket_id = 'project-documents'`
   - Policy for INSERT (authenticated users can upload): `bucket_id = 'project-documents' AND auth.role() = 'authenticated'`

### 3. Verify Setup

After completing the setup, verify that:

1. The `project_submissions` table exists in your database
2. The `project_submissions_view` view exists
3. The `pending_submissions_count` view exists
4. The `project-documents` storage bucket exists and is set to public
5. The bucket has the proper RLS policies

## Troubleshooting Common Errors

### "Violates row-level security policy" Error

This error occurs when:
1. You're trying to upload files without being authenticated
2. The storage bucket doesn't have proper RLS policies
3. You're trying to create a bucket without admin privileges

**Solution:**
- Make sure you're logged in when uploading files
- Create the bucket manually through the Supabase dashboard
- Set RLS policies as described above

### "Bucket not found" Error

This happens when the application tries to upload to a non-existent bucket.

**Solution:**
- Ensure the bucket name is exactly `project-documents`
- Create the bucket manually as described above

### Permission Issues

If users cannot upload files or submit projects:

1. Check that users are authenticated before attempting to submit projects
2. Verify that the user has an entry in the `profiles` table
3. Check that the student has a supervisor assigned in the `student_supervisor_relationships` table

## Using the Project Submission System

### Student Workflow

1. Navigate to the Student Dashboard
2. Go to the "Submit" tab
3. Fill in project details (title, abstract, keywords)
4. Upload project document
5. Review and submit

### Supervisor Workflow

1. Navigate to the Supervisor Dashboard
2. Go to the "Project Review" tab
3. View pending submissions
4. Review submission details and documents
5. Approve or reject submissions with feedback 