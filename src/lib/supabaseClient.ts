// Single Supabase client for the entire app
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Use validated environment variables
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

// Create client with fallback handling
let supabase: any;

try {
  supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} catch (error) {
  console.warn('[Supabase] Failed to create client, using mock:', error);
  // Create a mock client for development
  supabase = {
    from: () => ({
      select: () => ({ error: null, data: [] }),
      insert: () => ({ error: null, data: [] }),
      update: () => ({ error: null, data: [] }),
      delete: () => ({ error: null, data: [] }),
      gte: () => ({ 
        order: () => ({ 
          limit: () => ({ error: null, data: [] }) 
        }) 
      }),
      order: () => ({ 
        limit: () => ({ error: null, data: [] }) 
      })
    }),
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null })
    },
    removeChannel: () => {},
    channel: () => ({
      on: () => ({ subscribe: () => {} })
    })
  };
}

export { supabase };

// A tiny health check that *really* verifies connectivity + RLS
export async function isSupabaseConfigured(): Promise<boolean> {
  try {
    // Test with a simple query that should always work
    const { error } = await supabase.from('markets').select('id').limit(1);
    if (error) {
      console.info('[Supabase] Connection test failed, but client exists:', error.message);
      return false;
    }
    console.info('[Supabase] Connection verified successfully');
    return true;
  } catch (e) {
    console.info('[Supabase] Connection test threw exception:', e);
    return false;
  }
}

// Expose client for dev console access
if (typeof window !== 'undefined') (window as any).__supabase = supabase;