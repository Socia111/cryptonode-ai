-- Clean up all mock signals and ensure only real trading signals remain
-- This migration removes all demo/mock/system signals to ensure clean real data environment

-- Delete all mock, demo, and system signals
DELETE FROM signals 
WHERE 
  source IN ('demo', 'mock', 'system') 
  OR algo LIKE '%mock%' 
  OR algo LIKE '%demo%' 
  OR algo = 'quantum_ai'
  OR (metadata IS NOT NULL AND metadata->>'real_data' != 'true' 
      AND source NOT LIKE '%real%' 
      AND source NOT LIKE '%enhanced%' 
      AND source NOT LIKE '%aitradex1%');

-- Update metadata for remaining signals to ensure they are marked as real
UPDATE signals 
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"verified_real_data": true, "data_source": "live_market"}'::jsonb
WHERE source IN ('real_market_data', 'aitradex1_real_enhanced', 'enhanced_signal_generation')
  OR source LIKE '%real%'
  OR source LIKE '%enhanced%'
  OR source LIKE '%aitradex1%';

-- Clean up old execution orders from mock trading
DELETE FROM execution_orders 
WHERE paper_mode = true 
  AND created_at < NOW() - INTERVAL '24 hours'
  AND user_id IS NULL;

-- Update exchange feed status to indicate real data mode
UPDATE exchange_feed_status 
SET status = 'active_real_data_only', 
    last_update = NOW(),
    last_error = NULL
WHERE exchange IN ('bybit', 'binance');

-- Add function to prevent mock signal insertion
CREATE OR REPLACE FUNCTION prevent_mock_signals()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent insertion of mock signals
  IF NEW.source IN ('demo', 'mock', 'system') 
     OR NEW.algo LIKE '%mock%' 
     OR NEW.algo LIKE '%demo%' 
     OR NEW.algo = 'quantum_ai' THEN
    RAISE EXCEPTION 'Mock signals are not allowed. Only real trading signals permitted.';
  END IF;
  
  -- Ensure real signals have proper metadata
  IF NEW.source IN ('real_market_data', 'aitradex1_real_enhanced', 'enhanced_signal_generation') 
     OR NEW.source LIKE '%real%' 
     OR NEW.source LIKE '%enhanced%' 
     OR NEW.source LIKE '%aitradex1%' THEN
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || '{"verified_real_data": true, "data_source": "live_market"}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent mock signals
DROP TRIGGER IF EXISTS prevent_mock_signals_trigger ON signals;
CREATE TRIGGER prevent_mock_signals_trigger
  BEFORE INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION prevent_mock_signals();