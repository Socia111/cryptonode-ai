import { createClient } from '@supabase/supabase-js'

// Environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Check if we have real credentials (not placeholders)
const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key'

if (!hasValidCredentials) {
  console.warn('⚠️ Supabase credentials not configured. Using mock client.')
  console.warn('📝 To connect to Supabase:')
  console.warn('1. Create a .env file in your project root')
  console.warn('2. Add: VITE_SUPABASE_URL=your_project_url')
  console.warn('3. Add: VITE_SUPABASE_ANON_KEY=your_anon_key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: hasValidCredentials,
    persistSession: hasValidCredentials,
  },
  realtime: {
    params: {
      eventsPerSecond: hasValidCredentials ? 10 : 0,
    },
  },
})

// Export a flag to check if Supabase is properly configured
export const isSupabaseConfigured = hasValidCredentials