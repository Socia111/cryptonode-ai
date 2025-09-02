-- Make sure the table is in the publication
CREATE PUBLICATION IF NOT EXISTS supabase_realtime FOR TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- RLS must be enabled for realtime; then add permissive policies
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "signals select" ON public.signals;
DROP POLICY IF EXISTS "signals write" ON public.signals;
DROP POLICY IF EXISTS "signals update" ON public.signals;

-- Create permissive public policies
CREATE POLICY "signals public select" ON public.signals
  FOR SELECT USING (true);

CREATE POLICY "signals public insert" ON public.signals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "signals public update" ON public.signals
  FOR UPDATE USING (true) WITH CHECK (true);