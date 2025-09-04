-- Fix realtime issues and enable proper automation
-- Only set replica identity to FULL since table is already in publication
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Enable realtime for user_trading_configs table
ALTER publication supabase_realtime ADD TABLE public.user_trading_configs;
ALTER TABLE public.user_trading_configs REPLICA IDENTITY FULL;