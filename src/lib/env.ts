// Environmental variable validation with Zod
import { z } from 'zod';

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(10, 'Supabase anon key too short'),
  VITE_SUPABASE_PROJECT_ID: z.string().min(5, 'Project ID required'),
});

// Validate environment at build time
export const env = EnvSchema.parse(import.meta.env);

// Type-safe env access
export type Env = z.infer<typeof EnvSchema>;