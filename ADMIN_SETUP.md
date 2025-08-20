# Admin Panel Setup Guide

The admin dashboard requires additional configuration to properly handle user management. There are two options to set this up:

## Option 1: Set up Service Role Key (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to Project Settings > API
3. Find the "service_role key" (it's secret - don't share it publicly)
4. Create or edit your `.env.local` file in the project root
5. Add these lines:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**IMPORTANT**: Keep your service role key secure and never expose it in client-side code. It has admin privileges!

## Option 2: Update Row-Level Security Policies

If you prefer not to use the service role key, you can update the RLS policies in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to Database > Tables > profiles
3. Click on the "Policies" tab
4. Add these policies:

### Enable read access for authenticated users
```sql
CREATE POLICY "Enable read access for authenticated users"
ON profiles
FOR SELECT
TO authenticated
USING (true);
```

### Enable insert for authenticated users
```sql
CREATE POLICY "Enable insert for authenticated users"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);
```

### Enable update for users based on their ID
```sql
CREATE POLICY "Enable update for users based on their ID"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

### Enable delete for admin users
```sql
CREATE POLICY "Enable delete for admin users"
ON profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
  )
);
```

## Troubleshooting

If you see Row-Level Security errors like:

```
new row violates row-level security policy for table "profiles"
```

It means your current user doesn't have permission to perform that operation according to the RLS policies.

Either:
1. Set up the service role key as described in Option 1, or
2. Update the RLS policies as described in Option 2 