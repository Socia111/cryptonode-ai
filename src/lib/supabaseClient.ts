// Remove this file to avoid multiple client instances
// We'll use the main Supabase client from integrations
export { supabase } from '@/integrations/supabase/client';

import { supabase } from '@/integrations/supabase/client';

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