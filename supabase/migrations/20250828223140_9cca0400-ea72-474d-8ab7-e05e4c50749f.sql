-- Enable real-time updates for signals table
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Add signals table to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;