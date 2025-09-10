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

// Always provide fallbacks if environment variables are missing
const finalEnv = {
  VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key-fallback',
  VITE_SUPABASE_PROJECT_ID: env.VITE_SUPABASE_PROJECT_ID || 'placeholder-project-id'
};

export { finalEnv as env };

// Type-safe env access
export type Env = typeof finalEnv;