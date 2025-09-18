-- Phase 4 Fixed: Database Permissions & RLS Policies for Live Trading System

-- Update RLS policies for live trading edge functions
DROP POLICY IF EXISTS "Service role can manage all signals" ON signals;
CREATE POLICY "Edge functions can manage all signals" 
ON signals FOR ALL
USING (true)
WITH CHECK (true);

-- Fix execution_orders permissions for edge functions  
DROP POLICY IF EXISTS "Edge functions can insert paper orders" ON execution_orders;
CREATE POLICY "Edge functions can manage execution orders" 
ON execution_orders FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure live_market_data is accessible to all edge functions
DROP POLICY IF EXISTS "Service role can manage live market data" ON live_market_data;
CREATE POLICY "Edge functions can manage live market data" 
ON live_market_data FOR ALL
USING (true)
WITH CHECK (true);

-- Fix user_trading_accounts access for edge functions
DROP POLICY IF EXISTS "Service role and users can access trading accounts" ON user_trading_accounts;
CREATE POLICY "Edge functions can access trading accounts" 
ON user_trading_accounts FOR ALL
USING (true)
WITH CHECK (true);

-- Fix exchange_feed_status access - allow public read for status monitoring
DROP POLICY IF EXISTS "Service role can manage exchange feed status" ON exchange_feed_status;
CREATE POLICY "Public read access to exchange feed status" 
ON exchange_feed_status FOR SELECT
USING (true);

CREATE POLICY "Edge functions can manage exchange feed status" 
ON exchange_feed_status FOR ALL
USING (true)
WITH CHECK (true);

-- Add comprehensive trading configs access
DROP POLICY IF EXISTS "Service role can manage trading configs" ON trading_configs;
CREATE POLICY "Edge functions can manage trading configs" 
ON trading_configs FOR ALL
USING (true)
WITH CHECK (true);

-- Fix audit_log permissions for edge functions
DROP POLICY IF EXISTS "Service role can manage audit logs for edge functions" ON audit_log;
CREATE POLICY "Edge functions can manage audit logs" 
ON audit_log FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure markets table is fully accessible
DROP POLICY IF EXISTS "Service role can manage markets" ON markets;
CREATE POLICY "Edge functions can manage markets" 
ON markets FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger to ensure real signals only
DROP TRIGGER IF EXISTS prevent_mock_signals_trigger ON signals;
CREATE TRIGGER prevent_mock_signals_trigger
  BEFORE INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION prevent_mock_signals();

-- Add index for better signal performance (fixed)
DROP INDEX IF EXISTS idx_signals_realtime;
CREATE INDEX idx_signals_realtime 
ON signals (created_at DESC, source, is_active) 
WHERE expires_at > CURRENT_TIMESTAMP AND source LIKE '%real%';

-- Add index for live market data performance
CREATE INDEX IF NOT EXISTS idx_live_market_data_realtime 
ON live_market_data (exchange, symbol, created_at DESC);

-- Add index for execution orders performance
CREATE INDEX IF NOT EXISTS idx_execution_orders_realtime 
ON execution_orders (user_id, created_at DESC, status);

-- Update system status for live mode
INSERT INTO app_settings (key, value) 
VALUES ('system_mode', '"live_production"'::jsonb)
ON CONFLICT (key) DO UPDATE SET 
  value = '"live_production"'::jsonb,
  updated_at = now();

INSERT INTO app_settings (key, value) 
VALUES ('last_system_fix', to_jsonb(now()))
ON CONFLICT (key) DO UPDATE SET 
  value = to_jsonb(now()),
  updated_at = now();