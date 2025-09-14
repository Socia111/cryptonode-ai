-- Fix RLS policies for signals table to allow proper access

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Anyone can read signals" ON public.signals;
DROP POLICY IF EXISTS "Allow service role to manage signals" ON public.signals;
DROP POLICY IF EXISTS "Service role can manage all signals" ON public.signals;
DROP POLICY IF EXISTS "Authenticated users can insert signals" ON public.signals;

-- Create clear, non-conflicting policies
CREATE POLICY "Public can read signals" 
  ON public.signals 
  FOR SELECT 
  USING (true);

CREATE POLICY "Service role full access" 
  ON public.signals 
  FOR ALL 
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert" 
  ON public.signals 
  FOR INSERT 
  WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- Ensure RLS is enabled
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;