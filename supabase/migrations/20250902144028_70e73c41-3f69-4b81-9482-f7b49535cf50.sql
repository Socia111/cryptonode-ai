-- Add signals table to the publication (fixed syntax)
DO $$
BEGIN
  -- Add table to existing publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
  END IF;
END $$;

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