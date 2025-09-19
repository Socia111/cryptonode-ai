-- ✅ Phase 1: Fix Signal Generation - Relax cooldown (30m instead of 2h)
CREATE OR REPLACE FUNCTION enforce_signal_cooldown()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM signals s
    WHERE s.symbol = NEW.symbol
      AND s.timeframe = NEW.timeframe
      AND s.direction = NEW.direction
      AND s.source = NEW.source
      AND s.algo = NEW.algo
      AND s.created_at > NOW() - INTERVAL '30 minutes'
      AND s.is_active = true
  ) THEN
    RAISE EXCEPTION 'Cooldown: recent signal exists for % % %', NEW.symbol, NEW.timeframe, NEW.direction
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Re-create the trigger with relaxed cooldown
DROP TRIGGER IF EXISTS signals_cooldown_guard ON signals;
CREATE TRIGGER signals_cooldown_guard
  BEFORE INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION enforce_signal_cooldown();

-- ✅ Phase 3: Create execution_orders table for trade pipeline
CREATE TABLE IF NOT EXISTS execution_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES signals(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('LONG','SHORT','BUY','SELL')),
  qty numeric NOT NULL CHECK (qty > 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending','submitted','executed','failed','cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on execution_orders
ALTER TABLE execution_orders ENABLE ROW LEVEL SECURITY;

-- Policies for execution_orders
CREATE POLICY "Public read execution orders" ON execution_orders FOR SELECT USING (true);
CREATE POLICY "Service role manages execution orders" ON execution_orders FOR ALL USING (auth.role() = 'service_role'::text);

-- ✅ Phase 2: Enable Automated Trading Config
UPDATE automated_trading_config 
SET 
  enabled = true,
  min_signal_score = 60,  -- Lowered threshold
  max_concurrent_trades = 5,
  max_daily_trades = 25,
  updated_at = now()
WHERE user_id = 'ea52a338-c40d-4809-9014-10151b3af9af';

-- Create default config if it doesn't exist
INSERT INTO automated_trading_config (
  user_id, enabled, min_signal_score, max_concurrent_trades, max_daily_trades,
  risk_per_trade, preferred_timeframes, excluded_symbols, active_exchanges
)
SELECT 
  'ea52a338-c40d-4809-9014-10151b3af9af',
  true,
  60,  -- Lowered threshold
  5,
  25,
  0.02,
  ARRAY['15m', '30m', '1h'],
  ARRAY[]::text[],
  ARRAY['bybit', 'binance']
WHERE NOT EXISTS (
  SELECT 1 FROM automated_trading_config 
  WHERE user_id = 'ea52a338-c40d-4809-9014-10151b3af9af'
);

-- ✅ Update system status for lower thresholds
UPDATE system_status 
SET 
  metadata = metadata || '{"min_score_threshold": 60, "consensus_required": false}'::jsonb,
  last_update = now()
WHERE service_name = 'automated_trading';

-- Add realtime replication for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE execution_orders;

-- Grant permissions for observability
GRANT SELECT ON execution_orders TO anon, authenticated;
GRANT SELECT ON signals TO anon, authenticated;
GRANT SELECT ON system_status TO anon, authenticated;