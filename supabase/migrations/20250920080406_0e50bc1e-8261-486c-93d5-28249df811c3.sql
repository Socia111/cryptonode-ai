-- Fix RLS policies for markets table to allow public read access
DROP POLICY IF EXISTS "Authenticated users can read markets" ON public.markets;

CREATE POLICY "Public read access to markets" 
ON public.markets 
FOR SELECT 
USING (true);

-- Fix RLS policies for signals table
DROP POLICY IF EXISTS "Authenticated read active signals" ON public.signals;
DROP POLICY IF EXISTS "signals_read_active" ON public.signals;

CREATE POLICY "Public read active signals" 
ON public.signals 
FOR SELECT 
USING (is_active = true AND score >= 60);