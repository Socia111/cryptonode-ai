-- Enable realtime for signals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- Set replica identity to full for complete row data during updates
ALTER TABLE public.signals REPLICA IDENTITY FULL;