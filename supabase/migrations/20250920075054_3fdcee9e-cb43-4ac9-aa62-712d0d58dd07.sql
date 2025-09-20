-- Fix markets table access for authenticated users
-- The markets table should be readable by authenticated users

-- Update the existing policy to allow authenticated users
DROP POLICY IF EXISTS "Markets are publicly readable" ON public.markets;
DROP POLICY IF EXISTS "Public read access to markets" ON public.markets;

-- Create a new policy that allows authenticated users to read markets
CREATE POLICY "Authenticated users can read markets"
ON public.markets
FOR SELECT
TO authenticated
USING (true);

-- Keep service role access for management
CREATE POLICY "Service role can manage markets"
ON public.markets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);