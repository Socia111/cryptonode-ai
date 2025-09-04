// Environmental variable validation with production fallbacks
import { z } from 'zod';

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(10, 'Supabase anon key too short'),
  VITE_SUPABASE_PROJECT_ID: z.string().min(5, 'Project ID required'),
});

// Production-ready environment configuration
let env: z.infer<typeof EnvSchema>;

try {
  env = EnvSchema.parse(import.meta.env);
} catch (error) {
  console.warn('[Env] Environment validation failed, using production values');
  // Use actual production values
  env = {
    VITE_SUPABASE_URL: 'https://codhlwjogfjywmjyjbbn.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
    VITE_SUPABASE_PROJECT_ID: 'codhlwjogfjywmjyjbbn'
  };
}

export { env };

// Type-safe env access
export type Env = z.infer<typeof EnvSchema>;