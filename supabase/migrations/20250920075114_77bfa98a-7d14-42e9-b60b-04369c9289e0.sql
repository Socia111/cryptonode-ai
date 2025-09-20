-- Fix markets table access for authenticated users
-- Remove all existing policies first
DROP POLICY IF EXISTS "Markets are publicly readable" ON public.markets;
DROP POLICY IF EXISTS "Public read access to markets" ON public.markets;
DROP POLICY IF EXISTS "Service role can manage markets" ON public.markets;

-- Create proper policies for authenticated access
CREATE POLICY "Authenticated users can read markets"
ON public.markets
FOR SELECT
TO authenticated
USING (true);

-- Create service role policy
CREATE POLICY "Service role manages markets"
ON public.markets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);