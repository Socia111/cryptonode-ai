// Single Supabase client for the entire app
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { env } from './env';

// Use validated environment variables
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

// Single client instance to avoid multiple auth warnings  
const supabase = createClient<Database>(url, key, {
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
      'x-client-info': 'aitradex1-unified',
    },
  },
});

// Export the unified client for all uses
export { supabase };

console.log('[Supabase] Client created successfully with enhanced config');

// Type-safe health check that verifies connectivity + RLS
export async function isSupabaseConfigured(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('markets')
      .select('id')
      .limit(1);
    
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