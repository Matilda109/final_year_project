# Fixing Storage RLS Policy Errors

This guide will help you resolve the "violates row-level security policy" errors when uploading files to Supabase storage.

## Error Messages You're Seeing

```
StorageApiError: new row violates row-level security policy
```

```
Error: Error creating storage bucket: new row violates row-level security policy
```

These errors occur because:
1. The application doesn't have permission to create storage buckets
2. The storage bucket doesn't exist or lacks proper RLS policies

## Step-by-Step Fix

### 1. Create Storage Bucket Manually

First, create the required storage bucket through the Supabase dashboard:

1. Log in to your Supabase account
2. Go to your project dashboard
3. Click on "Storage" in the left sidebar
4. Click the "New Bucket" button
5. Enter `project-documents` as the bucket name (case sensitive)
6. Check the "Public bucket" checkbox to make files publicly accessible
7. Click "Create bucket"

### 2. Set Storage RLS Policies

After creating the bucket, set the proper RLS policies:

1. In your Supabase dashboard, go to "Authentication" → "Policies"
2. Find the `storage.objects` table in the list
3. Click "New Policy"
4. Add a policy for reading files:
   - Policy name: "Anyone can view project documents"
   - For operation: SELECT
   - Using expression: `bucket_id = 'project-documents'`
   - Click "Save policy"

5. Add another policy for uploading files:
   - Click "New Policy" again
   - Policy name: "Authenticated users can upload project documents"
   - For operation: INSERT
   - Using expression: `bucket_id = 'project-documents' AND auth.role() = 'authenticated'`
   - Click "Save policy"

### 3. Verify User Authentication

Ensure the user is properly authenticated:

1. Check that you're logged in when using the application
2. Verify that the auth token is not expired
3. Check that the user exists in the `profiles` table

### 4. Restart Your Application

1. Stop your development server (Ctrl+C in the terminal)
2. Start it again with `npm run dev` or your preferred start command
3. Try uploading a file again

### 5. Check Browser Console for Errors

If you're still seeing errors:

1. Open your browser's developer tools (F12 or right-click → Inspect)
2. Go to the "Console" tab
3. Look for specific error messages related to Supabase
4. Note any error codes or messages for troubleshooting

## Still Having Issues?

If you're still encountering errors after following these steps:

1. Verify that your Supabase project URL and anon key are correctly configured in your `.env.local` file
2. Check that your user has a valid entry in the `profiles` table
3. Make sure the student has a supervisor assigned in the `student_supervisor_relationships` table

For more detailed setup instructions, refer to the `PROJECT_SUBMISSION_SETUP.md` file. 