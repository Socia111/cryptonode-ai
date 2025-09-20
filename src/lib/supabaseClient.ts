// Remove this file to avoid multiple client instances
// We'll use the main Supabase client from integrations
export { supabase } from '@/integrations/supabase/client';

import { supabase } from '@/integrations/supabase/client';

// A tiny health check that *really* verifies connectivity + RLS
export async function isSupabaseConfigured(): Promise<boolean> {
  try {
    // Use signals table instead as it's publicly readable for high-score signals
    const { error } = await supabase.from('signals').select('id').eq('is_active', true).limit(1);
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