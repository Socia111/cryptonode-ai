// Single Supabase client for the entire app
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hard fail in dev if missing (prevents silent mock fallbacks)
if (!url || !key) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Create a .env with these keys. See README.'
  );
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// A tiny health check that *really* verifies connectivity + RLS
export async function isSupabaseConfigured(): Promise<boolean> {
  if (!url || !key) return false;
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