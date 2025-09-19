-- ✅ Phase 3: Create observability views and functions for monitoring
-- 1) Fresh signals in the last 30 minutes
CREATE OR REPLACE VIEW signals_last_30m AS
SELECT
  s.id,
  s.symbol,
  s.timeframe,
  s.direction,
  s.price,
  s.entry_price,
  s.stop_loss,
  s.take_profit,
  s.score,
  s.confidence,
  COALESCE(s.signal_grade, 'C') AS grade,
  s.source,
  s.algo,
  s.created_at,
  s.expires_at,
  s.is_active
FROM signals s
WHERE s.created_at > NOW() - INTERVAL '30 minutes'
ORDER BY s.created_at DESC;

-- 2) Live (non-expired) signals
CREATE OR REPLACE VIEW signals_live AS
SELECT
  s.id,
  s.symbol,
  s.timeframe,
  s.direction,
  s.price,
  s.score,
  COALESCE(s.signal_grade, 'C') AS grade,
  s.created_at,
  s.expires_at,
  s.is_active,
  s.source,
  s.algo
FROM signals s
WHERE s.is_active IS TRUE
  AND (s.expires_at IS NULL OR s.expires_at > NOW())
ORDER BY s.created_at DESC;

-- 3) Execution orders in the last 30 minutes (using execution_queue as fallback)
CREATE OR REPLACE VIEW execution_orders_last_30m AS
SELECT
  eq.id,
  eq.signal_id,
  eq.symbol,
  eq.side,
  eq.amount_usd as qty,
  eq.status,
  eq.created_at
FROM execution_queue eq
WHERE eq.created_at > NOW() - INTERVAL '30 minutes'
ORDER BY eq.created_at DESC;

-- 4) Signals joined to their orders
CREATE OR REPLACE VIEW signals_with_orders_last_30m AS
SELECT
  s.id AS signal_id,
  s.symbol,
  s.timeframe,
  s.direction,
  s.price,
  s.score,
  COALESCE(s.signal_grade, 'C') AS grade,
  s.created_at AS signal_time,
  eq.id   AS order_id,
  eq.status AS order_status,
  eq.amount_usd AS qty,
  eq.created_at AS order_time
FROM signals s
LEFT JOIN execution_queue eq ON eq.signal_id = s.id
WHERE s.created_at > NOW() - INTERVAL '30 minutes'
ORDER BY s.created_at DESC, eq.created_at DESC;

-- 5) System heartbeat
CREATE OR REPLACE VIEW system_heartbeat AS
SELECT
  service_name as component,
  status,
  MAX(last_update) AS last_heartbeat
FROM system_status
GROUP BY service_name, status
ORDER BY MAX(last_update) DESC;

-- KPI functions
CREATE OR REPLACE FUNCTION get_debug_kpis()
RETURNS TABLE (
  signals_30m INT,
  orders_30m  INT,
  latest_signal timestamptz,
  latest_order  timestamptz
) LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT COUNT(*)::int FROM signals_last_30m),
    (SELECT COUNT(*)::int FROM execution_orders_last_30m),
    (SELECT MAX(created_at) FROM signals_last_30m),
    (SELECT MAX(created_at) FROM execution_orders_last_30m)
$$;

-- Per-symbol throughput
CREATE OR REPLACE FUNCTION get_symbol_throughput_30m()
RETURNS TABLE (
  symbol text,
  signals int,
  orders  int
) LANGUAGE sql STABLE AS $$
  SELECT
    s.symbol,
    COUNT(*)::int AS signals,
    COALESCE(SUM(CASE WHEN eq.id IS NOT NULL THEN 1 ELSE 0 END)::int, 0) AS orders
  FROM signals_last_30m s
  LEFT JOIN execution_queue eq ON eq.signal_id = s.id
  GROUP BY s.symbol
  ORDER BY signals DESC
$$;

-- Grant permissions for observability (safe to run multiple times)
GRANT SELECT ON signals_last_30m TO anon, authenticated;
GRANT SELECT ON signals_live TO anon, authenticated;
GRANT SELECT ON execution_orders_last_30m TO anon, authenticated;
GRANT SELECT ON signals_with_orders_last_30m TO anon, authenticated;
GRANT SELECT ON system_heartbeat TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_debug_kpis() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_symbol_throughput_30m() TO anon, authenticated;