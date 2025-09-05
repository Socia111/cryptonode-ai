// Environmental variable validation with Zod
import { z } from 'zod';

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(10, 'Supabase anon key too short'),
  VITE_SUPABASE_PROJECT_ID: z.string().min(5, 'Project ID required'),
});

// Validate environment at build time with fallbacks
let env: z.infer<typeof EnvSchema>;

try {
  env = EnvSchema.parse(import.meta.env);
} catch (error) {
  console.warn('[Env] Using fallback values due to validation error:', error);
  // Fallback values for development
  env = {
    VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key-fallback',
    VITE_SUPABASE_PROJECT_ID: 'placeholder-project-id'
  };
}

export { env };

// Type-safe env access
export type Env = z.infer<typeof EnvSchema>;