-- Comprehensive signals system hardening - Part 2
-- Views and enhanced anti-mock protection

-- 6) Grade view without schema changes
CREATE OR REPLACE VIEW signals_live AS
SELECT
  s.*,
  CASE
    WHEN score >= 90 THEN 'A+'
    WHEN score >= 85 THEN 'A'
    WHEN score >= 80 THEN 'B'
    WHEN score >= 70 THEN 'C'
    ELSE 'D'
  END AS grade
FROM signals s
WHERE s.is_active = true AND (s.expires_at IS NULL OR s.expires_at > now())
ORDER BY s.created_at DESC;

-- 7) Latest per pair view for clean feeds
CREATE OR REPLACE VIEW signals_latest_per_pair AS
WITH ranked AS (
  SELECT s.*,
         row_number() OVER (
           PARTITION BY symbol, timeframe, direction
           ORDER BY created_at DESC
         ) AS rn
  FROM signals s
  WHERE s.is_active = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
)
SELECT *
FROM ranked
WHERE rn = 1
ORDER BY created_at DESC;

-- 8) Enhanced anti-mock trigger with secure search path
CREATE OR REPLACE FUNCTION prevent_mock_signals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF lower(NEW.source) IN ('demo','mock')
     OR lower(NEW.algo) LIKE '%mock%'
     OR NEW.price <= 0
     OR NEW.score < 60
  THEN
    RAISE EXCEPTION 'Mock/invalid signal rejected';
  END IF;
  
  -- Ensure real signals have proper metadata
  IF NEW.source IN ('real_market_data', 'aitradex1_real_enhanced', 'enhanced_signal_generation') 
     OR NEW.source LIKE '%real%' 
     OR NEW.source LIKE '%enhanced%' 
     OR NEW.source LIKE '%aitradex1%' THEN
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || '{"verified_real_data": true, "data_source": "live_market"}'::jsonb;
  END IF;
  
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_signal_anti_mock ON signals;
CREATE TRIGGER trg_signal_anti_mock
BEFORE INSERT ON signals
FOR EACH ROW EXECUTE FUNCTION prevent_mock_signals();

-- Fix other functions to have secure search paths
ALTER FUNCTION enforce_signal_cooldown() SET search_path = public;
ALTER FUNCTION expire_signals() SET search_path = public;
ALTER FUNCTION archive_signals(integer) SET search_path = public;