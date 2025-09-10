// Environmental variable validation with Zod
import { z } from 'zod';

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL').optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10, 'Supabase anon key too short').optional(),
  VITE_SUPABASE_PROJECT_ID: z.string().min(5, 'Project ID required').optional(),
});

// Validate environment at build time with fallbacks
let env: z.infer<typeof EnvSchema>;

try {
  env = EnvSchema.parse(import.meta.env);
} catch (error) {
  console.warn('[Env] Using fallback values due to validation error:', error);
  env = {};
}

// Use the actual Supabase project values from the project configuration
const finalEnv = {
  VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || 'https://codhlwjogfjywmjyjbbn.supabase.co',
  VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
  VITE_SUPABASE_PROJECT_ID: env.VITE_SUPABASE_PROJECT_ID || 'codhlwjogfjywmjyjbbn'
};

console.log('[Env] Loaded environment:', {
  url: finalEnv.VITE_SUPABASE_URL,
  hasKey: !!finalEnv.VITE_SUPABASE_ANON_KEY,
  projectId: finalEnv.VITE_SUPABASE_PROJECT_ID
});

export { finalEnv as env };

// Type-safe env access
export type Env = typeof finalEnv;