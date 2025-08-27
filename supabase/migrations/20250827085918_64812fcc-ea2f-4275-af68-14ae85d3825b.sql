-- Final database setup: RLS policies and realtime
-- Enable RLS for markets table
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Create public read policy for markets (for health checks)
CREATE POLICY "read_markets_public" ON markets 
FOR SELECT USING (true);

-- Ensure strategy_signals is in realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE strategy_signals;