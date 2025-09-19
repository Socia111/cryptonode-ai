// Single Supabase client for the entire app - MAIN CLIENT INSTANCE
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Direct constants to avoid env complications
const url = "https://codhlwjogfjywmjyjbbn.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

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