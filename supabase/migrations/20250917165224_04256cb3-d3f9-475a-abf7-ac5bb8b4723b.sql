-- Fix signals table permissions for edge functions
-- Grant service role access to signals table
GRANT ALL ON public.signals TO service_role;

-- Update the signals-api edge function policy to allow service role access
DROP POLICY IF EXISTS "Service role can manage all signals" ON public.signals;
CREATE POLICY "Service role can manage all signals" 
ON public.signals 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure anonymous users can still read active signals for the frontend
DROP POLICY IF EXISTS "Allow anonymous read access to active signals" ON public.signals;
CREATE POLICY "Allow anonymous read access to active signals" 
ON public.signals 
FOR SELECT 
TO anon, authenticated
USING (status = 'active');