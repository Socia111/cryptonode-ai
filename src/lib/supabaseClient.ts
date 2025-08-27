// Single Supabase client for the entire app
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Use validated environment variables
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// A tiny health check that *really* verifies connectivity + RLS
export async function isSupabaseConfigured(): Promise<boolean> {
  try {
    // Choose a public-read table; markets is ideal if you created it
    const { error } = await supabase.from('markets').select('id').limit(1);
    if (error) {
      console.warn('[Supabase] Config present but query failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Query threw:', e);
    return false;
  }
}

// Expose client for dev console access
if (typeof window !== 'undefined') (window as any).__supabase = supabase;