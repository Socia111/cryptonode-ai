// Unified Supabase client - redirects to the main client to prevent multiple instances
import { supabase as mainSupabaseClient } from '@/lib/supabaseClient';
import type { Database } from './types';

// Export the same client instance to prevent multiple GoTrueClient warnings
export const supabase = mainSupabaseClient as ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>;

// Type export for database types
export type { Database };