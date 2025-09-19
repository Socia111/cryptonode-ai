-- Final Go-Live Setup
-- Automation config 
INSERT INTO app_settings (key, value)
VALUES ('automated_trading_enabled', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now();

INSERT INTO app_settings (key, value)
VALUES ('live_trading_enabled', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now();

INSERT INTO app_settings (key, value)
VALUES ('min_signal_score', '60'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = '60'::jsonb, updated_at = now();

INSERT INTO app_settings (key, value)
VALUES ('consensus_required', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'false'::jsonb, updated_at = now();

-- KPIs function
CREATE OR REPLACE FUNCTION public.get_debug_kpis()
RETURNS TABLE (
  signals_30m INT,
  orders_30m  INT,
  latest_signal timestamptz,
  latest_order  timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::int FROM signals WHERE created_at > NOW() - INTERVAL '30 minutes'),
    (SELECT COUNT(*)::int FROM execution_orders WHERE created_at > NOW() - INTERVAL '30 minutes'),
    (SELECT MAX(created_at) FROM signals WHERE created_at > NOW() - INTERVAL '30 minutes'),
    (SELECT MAX(created_at) FROM execution_orders WHERE created_at > NOW() - INTERVAL '30 minutes')
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_debug_kpis() TO anon, authenticated;