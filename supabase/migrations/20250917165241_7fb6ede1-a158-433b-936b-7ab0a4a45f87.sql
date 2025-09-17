-- Fix signals table permissions for edge functions
-- Grant service role access to signals table
GRANT ALL ON public.signals TO service_role;

-- Ensure the service role policy exists and works correctly
DROP POLICY IF EXISTS "Service role can manage all signals" ON public.signals;
CREATE POLICY "Service role can manage all signals" 
ON public.signals 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Update anonymous access policy to use correct condition (no status column)
DROP POLICY IF EXISTS "Allow anonymous read access to active signals" ON public.signals;
CREATE POLICY "Allow anonymous read access to active signals" 
ON public.signals 
FOR SELECT 
TO anon, authenticated
USING (((expires_at IS NULL) OR (expires_at > now())) AND (created_at > (now() - '7 days'::interval)));