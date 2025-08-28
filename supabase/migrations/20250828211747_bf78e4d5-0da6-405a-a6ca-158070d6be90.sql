-- Add token audit logging for JWT generation tracking
CREATE TABLE IF NOT EXISTS public.token_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  service TEXT NOT NULL,
  scope TEXT,
  expires_in TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.token_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own token audit logs
CREATE POLICY "Users can view their own token audit logs" 
ON public.token_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Service role can manage all audit logs
CREATE POLICY "Service role can manage token audit logs" 
ON public.token_audit_log 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_token_audit_user_created 
ON public.token_audit_log (user_id, created_at DESC);

-- Update config to make coinapi-proxy public (no JWT verification needed)
-- This will be added to supabase/config.toml automatically