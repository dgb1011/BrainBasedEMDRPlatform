import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client-side Supabase instance (for browser use)
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
  
  return createClient(supabaseUrl, supabaseAnonKey);
}; 