-- Enable RLS and create policies for markets table
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to markets (needed for health checks)
CREATE POLICY "read_markets_public" ON public.markets 
FOR SELECT 
USING (true);

-- Enable realtime for strategy_signals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.strategy_signals;

-- Ensure strategy_signals has replica identity for realtime updates
ALTER TABLE public.strategy_signals REPLICA IDENTITY FULL;