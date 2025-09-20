-- Phase 5: Database Schema Expansion - Performance Optimizations and Indexes

-- Create indexes for signals table (most frequently queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_active_score 
ON signals (is_active, score DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_timeframe_created 
ON signals (timeframe, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_symbol_direction 
ON signals (symbol, direction, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_score_confidence 
ON signals (score DESC, confidence DESC) 
WHERE is_active = true AND score >= 60;

-- Composite index for trading execution queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_orders_user_status 
ON execution_orders (user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_orders_symbol_created 
ON execution_orders (symbol, created_at DESC);

-- Edge event log indexes for monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_edge_event_log_fn_stage 
ON edge_event_log (fn, stage, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_edge_event_log_created_desc 
ON edge_event_log (created_at DESC);

-- User trading accounts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_trading_accounts_user_active 
ON user_trading_accounts (user_id, is_active) 
WHERE is_active = true;

-- Automated trading config indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automated_trading_config_enabled 
ON automated_trading_config (enabled, user_id) 
WHERE enabled = true;

-- System status indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_status_service_update 
ON system_status (service_name, last_update DESC);

-- Live market data indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_market_data_symbol_updated 
ON live_market_data (symbol, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_market_data_exchange_updated 
ON live_market_data (exchange, updated_at DESC);

-- Create materialized view for latest signals per symbol/timeframe
CREATE MATERIALIZED VIEW IF NOT EXISTS signals_latest_per_pair AS
SELECT DISTINCT ON (symbol, timeframe, direction)
    *,
    ROW_NUMBER() OVER (PARTITION BY symbol, timeframe ORDER BY created_at DESC, score DESC) as rn
FROM signals 
WHERE is_active = true 
  AND score >= 60
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY symbol, timeframe, direction, created_at DESC, score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_latest_per_pair_unique 
ON signals_latest_per_pair (symbol, timeframe, direction);

-- Create materialized view for live signals feed
CREATE MATERIALIZED VIEW IF NOT EXISTS signals_live AS
SELECT 
    s.*,
    CASE 
        WHEN s.metadata ? 'grade' THEN s.metadata->>'grade'
        ELSE 'C'
    END as grade
FROM signals s
WHERE s.is_active = true 
  AND s.score >= 70
  AND s.created_at >= NOW() - INTERVAL '6 hours'
ORDER BY s.created_at DESC, s.score DESC;

CREATE INDEX IF NOT EXISTS idx_signals_live_score_created 
ON signals_live (score DESC, created_at DESC);

-- Function to refresh materialized views
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

-- Function to get debug KPIs quickly
CREATE OR REPLACE FUNCTION get_debug_kpis()
RETURNS TABLE(
  signals_30m integer,
  orders_30m integer,
  latest_signal timestamp with time zone,
  latest_order timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM signals WHERE created_at > NOW() - INTERVAL '30 minutes'),
    (SELECT COUNT(*)::int FROM execution_orders WHERE created_at > NOW() - INTERVAL '30 minutes'),
    (SELECT MAX(created_at) FROM signals WHERE created_at > NOW() - INTERVAL '30 minutes'),
    (SELECT MAX(created_at) FROM execution_orders WHERE created_at > NOW() - INTERVAL '30 minutes')
$$;

-- Function to get symbols for scanning (respects whitelist)
CREATE OR REPLACE FUNCTION get_symbols_for_scanning()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_row public.whitelist_settings%ROWTYPE;
BEGIN
  -- Get the latest whitelist settings
  SELECT * INTO settings_row 
  FROM public.whitelist_settings 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- If whitelist is enabled and has symbols, return them
  IF settings_row.whitelist_enabled AND array_length(settings_row.whitelist_pairs, 1) > 0 THEN
    RETURN settings_row.whitelist_pairs;
  END IF;
  
  -- Otherwise return all major USDT pairs
  RETURN ARRAY[
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
    'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT'
  ];
END;
$$;

-- Function to increment credit usage with validation
CREATE OR REPLACE FUNCTION increment_credit_usage(p_user_id uuid, p_credits integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_config public.automated_trading_config%ROWTYPE;
BEGIN
  -- Get current config
  SELECT * INTO current_config 
  FROM public.automated_trading_config 
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF (COALESCE(current_config.credits_used, 0) + p_credits) > COALESCE(current_config.credit_allowance, 250) THEN
    RETURN false; -- Insufficient credits
  END IF;
  
  -- Update credit usage
  UPDATE public.automated_trading_config 
  SET 
    credits_used = COALESCE(credits_used, 0) + p_credits,
    last_trade_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Update daily stats
  INSERT INTO public.trading_stats (user_id, date, trades_executed, credits_used)
  VALUES (p_user_id, CURRENT_DATE, 1, p_credits)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    trades_executed = public.trading_stats.trades_executed + 1,
    credits_used = public.trading_stats.credits_used + p_credits,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Function to initialize real system (production mode)
CREATE OR REPLACE FUNCTION initialize_real_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update system status for real data feeds
  INSERT INTO exchange_feed_status (exchange, status, last_update, symbols_tracked, error_count)
  VALUES 
    ('bybit', 'initializing', now(), 50, 0),
    ('binance', 'initializing', now(), 50, 0)
  ON CONFLICT (exchange) 
  DO UPDATE SET 
    status = 'initializing',
    last_update = now(),
    symbols_tracked = 50,
    error_count = 0;

  result := jsonb_build_object(
    'success', true,
    'mode', 'live_data',
    'feeds_status', 'initializing',
    'timestamp', now()
  );

  RETURN result;
END;
$$;