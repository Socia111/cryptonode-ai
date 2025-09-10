// Single Supabase client for the entire app
import { createClient } from '@supabase/supabase-js';

// Direct configuration - no env wrapper needed
const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

// Create fresh Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Simple health check
export async function isSupabaseConfigured(): Promise<boolean> {
  try {
    console.log('[Supabase] Testing connection...');
    const { data, error } = await supabase.from('signals').select('id').limit(1);
    if (error) {
      console.error('[Supabase] Connection test failed:', error);
      return false;
    }
    console.log('[Supabase] Connection test successful');
    return true;
  } catch (e) {
    console.error('[Supabase] Connection test error:', e);
    return false;
  }
}