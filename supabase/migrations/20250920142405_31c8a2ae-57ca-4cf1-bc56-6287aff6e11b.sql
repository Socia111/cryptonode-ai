-- Emergency fixes for all permission issues (corrected)

-- Fix sequence permissions for edge_event_log
GRANT USAGE, SELECT ON SEQUENCE edge_event_log_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE edge_event_log_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE edge_event_log_id_seq TO authenticated;

-- Fix sequence permissions for trade_logs
GRANT USAGE, SELECT ON SEQUENCE trade_logs_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE trade_logs_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE trade_logs_id_seq TO authenticated;

-- Enable RLS on all tables that need it
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_event_log ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies and recreate them properly
DROP POLICY IF EXISTS "Service role manages app_settings" ON app_settings;
DROP POLICY IF EXISTS "edge_event_log_service_all" ON edge_event_log;
DROP POLICY IF EXISTS "edge_event_log_service_write" ON edge_event_log;

-- Create comprehensive service role policies
CREATE POLICY "service_role_full_access_app_settings" ON app_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_edge_event_log" ON edge_event_log
  FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read app_settings
CREATE POLICY "authenticated_read_app_settings" ON app_settings
  FOR SELECT USING (true);

-- Allow public read access to edge_event_log for debugging
CREATE POLICY "public_read_edge_event_log" ON edge_event_log
  FOR SELECT USING (true);

-- Ensure live_prices has proper policies
DROP POLICY IF EXISTS "Service role can manage live prices" ON live_prices;
CREATE POLICY "service_role_manage_live_prices" ON live_prices
  FOR ALL USING (true) WITH CHECK (true);

-- Ensure signals has proper policies
DROP POLICY IF EXISTS "Service role can manage all signals" ON signals;
CREATE POLICY "service_role_manage_all_signals" ON signals
  FOR ALL USING (true) WITH CHECK (true);

-- Grant direct table permissions to service role for critical tables
GRANT ALL ON live_prices TO service_role;
GRANT ALL ON edge_event_log TO service_role;
GRANT ALL ON app_settings TO service_role;
GRANT ALL ON signals TO service_role;
GRANT ALL ON execution_orders TO service_role;
GRANT ALL ON live_market_data TO service_role;

-- Enable realtime for critical tables (skip if already added)
ALTER TABLE signals REPLICA IDENTITY FULL;
ALTER TABLE live_prices REPLICA IDENTITY FULL;
ALTER TABLE execution_orders REPLICA IDENTITY FULL;

-- Only add to realtime publication if not already there
DO $$
BEGIN
    -- Check and add live_prices to publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'live_prices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE live_prices;
    END IF;
    
    -- Check and add execution_orders to publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'execution_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE execution_orders;
    END IF;
END $$;