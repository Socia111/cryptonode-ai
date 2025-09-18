-- Enable real-time functionality for trading tables
-- This allows the frontend to receive live updates for signals and trades

-- Enable replica identity for signals table
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Enable replica identity for execution_orders table  
ALTER TABLE public.execution_orders REPLICA IDENTITY FULL;

-- Enable replica identity for live_market_data table
ALTER TABLE public.live_market_data REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.execution_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_market_data;