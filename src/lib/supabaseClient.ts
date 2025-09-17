// Single Supabase client for the entire app
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Use validated environment variables
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

// Create client with enhanced configuration
let supabase: any;

try {
  supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-client-info': 'aitradex1-client',
      },
    },
  });
  
  console.log('[Supabase] Client created successfully with enhanced config');
} catch (error) {
  console.error('[Supabase] Failed to create client:', error);
  throw new Error('Supabase client initialization failed');
}

export { supabase };

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