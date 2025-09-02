-- Check if signals table is in the publication and add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
  END IF;
END $$;