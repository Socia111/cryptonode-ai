-- Enable realtime for signals table to fix subscription mismatch
ALTER TABLE public.signals REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.signals;

-- Also enable for other trading tables that might need realtime
ALTER TABLE public.live_market_data REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.live_market_data;

ALTER TABLE public.execution_orders REPLICA IDENTITY FULL; 
ALTER publication supabase_realtime ADD TABLE public.execution_orders;

ALTER TABLE public.system_status REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.system_status;