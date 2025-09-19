-- Remove paper trading functionality and fix missing functions
-- Remove paper trading fields from trade_logs
ALTER TABLE trade_logs DROP COLUMN IF EXISTS paper_trade;

-- Drop all paper trading related policies
DROP POLICY IF EXISTS "audit_log_paper_trades" ON audit_log;
DROP POLICY IF EXISTS "execution_orders_anonymous_paper_trades" ON execution_orders;
DROP POLICY IF EXISTS "execution_orders_paper_trades_anon_access" ON execution_orders;

-- Create missing materialized views function that's being called by cron
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh signals_latest_per_pair view if it exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'signals_latest_per_pair') THEN
    REFRESH MATERIALIZED VIEW signals_latest_per_pair;
  END IF;
  
  -- Refresh signals_live view if it exists  
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'signals_live') THEN
    REFRESH MATERIALIZED VIEW signals_live;
  END IF;
  
  -- Log successful refresh
  INSERT INTO edge_event_log (fn, stage, payload) 
  VALUES ('refresh_materialized_views', 'completed', '{"refreshed_at": "' || now() || '"}');
END;
$$;