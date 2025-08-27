import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables with safe defaults
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Validate URL format
const isValidUrl = (url: string): boolean => {
  if (!url) return false
  try {
    new URL(url)
    return url.includes('.supabase.co') || url.includes('localhost')
  } catch {
    return false
  }
}

// Check if we have valid credentials
export const isSupabaseConfigured = !!(
  isValidUrl(supabaseUrl) && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 20 &&
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey !== 'your_supabase_anon_key'
)

// Create client only if we have valid credentials
let supabaseClient: SupabaseClient | null = null

if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
    console.log('✅ Supabase client connected successfully')
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error)
    supabaseClient = null
  }
} else {
  console.warn('⚠️ Supabase not configured - running in demo mode')
  console.warn('📝 To connect to Supabase, click the green Supabase button in the top right')
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