-- Enable realtime for signals table with proper publication
ALTER publication supabase_realtime ADD TABLE public.signals;

-- Set replica identity to FULL to ensure complete row data during updates
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Enable realtime for user_trading_configs table
ALTER publication supabase_realtime ADD TABLE public.user_trading_configs;
ALTER TABLE public.user_trading_configs REPLICA IDENTITY FULL;