// Single Supabase client for the entire app
import { createClient } from '@supabase/supabase-js';

// Direct configuration - no env wrapper needed
const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

// Create Supabase client with explicit headers to fix API key issues
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable to avoid auth issues
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  }
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