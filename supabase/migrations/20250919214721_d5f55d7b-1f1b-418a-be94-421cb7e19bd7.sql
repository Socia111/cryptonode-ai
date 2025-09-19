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

-- ✅ Phase 2: Enable Automated Trading Config  
UPDATE automated_trading_config 
SET 
  enabled = true,
  min_signal_score = 60,  -- Lowered threshold
  max_concurrent_trades = 5,
  max_daily_trades = 25,
  updated_at = now()
WHERE user_id = 'ea52a338-c40d-4809-9014-10151b3af9af';

-- ✅ Update system status for lower thresholds
UPDATE system_status 
SET 
  metadata = metadata || '{"min_score_threshold": 60, "consensus_required": false}'::jsonb,
  last_update = now()
WHERE service_name = 'automated_trading';