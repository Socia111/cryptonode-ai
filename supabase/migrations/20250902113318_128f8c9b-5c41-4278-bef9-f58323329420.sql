-- Enable real-time updates for signals table
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Add signals table to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'signals'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
    END IF;
END $$;