-- Set replica identity to full for complete row data during updates
ALTER TABLE public.signals REPLICA IDENTITY FULL;