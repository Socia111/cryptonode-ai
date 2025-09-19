-- Phase 1: Fix Signal Generation - Disable Cooldown Logic
DROP TRIGGER IF EXISTS tr_enforce_signal_cooldown ON signals;

-- Create system_status table for monitoring
CREATE TABLE IF NOT EXISTS system_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0
);

-- Enable RLS for system_status
ALTER TABLE system_status ENABLE ROW LEVEL SECURITY;

-- Policy for system_status
CREATE POLICY "Public read system status" ON system_status FOR SELECT USING (true);
CREATE POLICY "Service role manages system status" ON system_status FOR ALL USING (auth.role() = 'service_role'::text);

-- Phase 2: Enable Automated Trading Config
UPDATE automated_trading_config 
SET 
  enabled = true,
  min_signal_score = 70,
  max_concurrent_trades = 5,
  max_daily_trades = 20,
  updated_at = now()
WHERE user_id = 'ea52a338-c40d-4809-9014-10151b3af9af';

-- Create automated trading config if it doesn't exist
INSERT INTO automated_trading_config (
  user_id, enabled, min_signal_score, max_concurrent_trades, max_daily_trades,
  risk_per_trade, preferred_timeframes, excluded_symbols, active_exchanges
)
SELECT 
  'ea52a338-c40d-4809-9014-10151b3af9af',
  true,
  70,
  5,
  20,
  0.02,
  ARRAY['15m', '30m', '1h'],
  ARRAY[]::text[],
  ARRAY['bybit', 'binance']
WHERE NOT EXISTS (
  SELECT 1 FROM automated_trading_config 
  WHERE user_id = 'ea52a338-c40d-4809-9014-10151b3af9af'
);

-- Phase 3: Clean execution pipeline
UPDATE execution_orders 
SET status = 'completed' 
WHERE status = 'processing' AND created_at < NOW() - INTERVAL '15 minutes';

-- Create signal generation trigger for real-time automation
CREATE OR REPLACE FUNCTION trigger_automated_trading()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process high-quality signals
  IF NEW.score >= 70 AND NEW.is_active = true THEN
    -- Log the signal for automated processing
    INSERT INTO edge_event_log (fn, stage, payload)
    VALUES (
      'automated_trading_trigger', 
      'signal_received',
      json_build_object(
        'signal_id', NEW.id,
        'symbol', NEW.symbol,
        'score', NEW.score,
        'direction', NEW.direction,
        'price', NEW.price
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automated trading
DROP TRIGGER IF EXISTS tr_automated_trading ON signals;
CREATE TRIGGER tr_automated_trading
  AFTER INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_automated_trading();

-- Initialize system status
INSERT INTO system_status (service_name, status, metadata) VALUES
  ('signal_generation', 'active', '{"last_signal_count": 0, "target_signals_per_hour": 60}'),
  ('automated_trading', 'active', '{"enabled": true, "live_trading": true}'),
  ('trade_execution', 'active', '{"queue_size": 0, "success_rate": 0}')
ON CONFLICT (service_name) DO UPDATE SET
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  last_update = now();