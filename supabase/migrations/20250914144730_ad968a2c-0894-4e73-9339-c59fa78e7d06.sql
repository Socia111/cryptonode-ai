-- Fix signals table RLS policies to ensure proper access
DROP POLICY IF EXISTS "Public can read signals" ON public.signals;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.signals;

-- Create comprehensive RLS policies for signals table
CREATE POLICY "Enable read access for all users" ON public.signals
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.signals
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));

CREATE POLICY "Enable insert for service role" ON public.signals
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Ensure realtime is enabled for signals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;