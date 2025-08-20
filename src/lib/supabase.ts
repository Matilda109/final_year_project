import { createClient } from '@supabase/supabase-js'

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or anonymous key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 

// Create a separate admin client that can bypass RLS
export const supabaseAdmin = supabaseServiceRoleKey ? 
  createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) : null;

// Helper function to get the admin client or throw a meaningful error
export const getAdminClient = () => {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase admin client not available. Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables.'
    );
  }
  return supabaseAdmin;
}; 