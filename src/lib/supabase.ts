import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if we have valid credentials
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url_here' && 
  supabaseAnonKey !== 'your_supabase_anon_key_here')

// Create client only if we have valid credentials
let supabaseClient: SupabaseClient | null = null

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
} else {
  console.warn('⚠️ Supabase credentials not configured.')
  console.warn('📝 To connect to Supabase:')
  console.warn('1. Create a .env file in your project root')
  console.warn('2. Add: VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.warn('3. Add: VITE_SUPABASE_ANON_KEY=your-anon-key-here')
}

// Mock client for development when Supabase is not configured
const mockClient = {
  from: (table: string) => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ data: [], error: null }),
    delete: () => ({ data: [], error: null }),
    upsert: () => ({ data: [], error: null }),
    eq: () => ({ data: [], error: null }),
    order: () => ({ data: [], error: null }),
    limit: () => ({ data: [], error: null }),
    gte: () => ({ data: [], error: null }),
    single: () => ({ data: null, error: null }),
  }),
  functions: {
    invoke: async () => ({ data: { success: true, message: 'Mock response' }, error: null })
  },
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) })
  }),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null })
  }
} as any

export const supabase = supabaseClient || mockClient