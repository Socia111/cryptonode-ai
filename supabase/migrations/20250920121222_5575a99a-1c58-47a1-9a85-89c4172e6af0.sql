-- Fix RLS policies for live_prices table
-- The edge functions need service role access to read live prices

-- First, check current policies and add missing ones
DROP POLICY IF EXISTS "Service role can insert live prices" ON public.live_prices;
DROP POLICY IF EXISTS "Service role can update live prices" ON public.live_prices;

-- Add comprehensive service role policies for live_prices
CREATE POLICY "Service role can insert live prices" 
ON public.live_prices 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Service role can update live prices" 
ON public.live_prices 
FOR UPDATE 
USING (auth.role() = 'service_role'::text);

-- Ensure signals table has proper service role policies
DROP POLICY IF EXISTS "Service role can insert signals" ON public.signals;
CREATE POLICY "Service role can insert signals" 
ON public.signals 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text);

-- Add public read policy for testing (authenticated users can read signals for testing)
DROP POLICY IF EXISTS "Authenticated users can read signals for testing" ON public.signals;
CREATE POLICY "Authenticated users can read signals for testing" 
ON public.signals 
FOR SELECT 
USING (auth.uid() IS NOT NULL);