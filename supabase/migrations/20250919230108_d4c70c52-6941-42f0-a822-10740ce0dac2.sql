-- Go-Live Database Setup (Fixed)
-- 1.1 Cooldown → 30 minutes
CREATE OR REPLACE FUNCTION public.enforce_signal_cooldown()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM signals s
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

DROP TRIGGER IF EXISTS signals_cooldown_guard ON signals;
CREATE TRIGGER signals_cooldown_guard
BEFORE INSERT ON signals
FOR EACH ROW EXECUTE FUNCTION enforce_signal_cooldown();

-- 1.2 Automation config on
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

-- 1.4 Debug/observability views & functions
-- Fresh signals last 30m
CREATE OR REPLACE VIEW signals_last_30m AS
SELECT s.id, s.symbol, s.timeframe, s.direction, s.price, s.score,
       s.created_at, s.expires_at, s.is_active, s.source, s.algo,
       s.entry_price, s.take_profit, s.stop_loss,
       COALESCE(s.metadata->>'grade', 'C') AS grade
FROM signals s
WHERE s.created_at > NOW() - INTERVAL '30 minutes'
ORDER BY s.created_at DESC;

-- Live signals (non-expired)
CREATE OR REPLACE VIEW signals_live AS
SELECT s.id, s.symbol, s.timeframe, s.direction, s.price, s.score,
       COALESCE(s.metadata->>'grade', 'C') AS grade, 
       s.created_at, s.expires_at,
       s.is_active, s.source, s.algo, s.entry_price, s.take_profit, s.stop_loss
FROM signals s
WHERE s.is_active IS TRUE
  AND (s.expires_at IS NULL OR s.expires_at > NOW())
ORDER BY s.created_at DESC;

-- Recent orders
CREATE OR REPLACE VIEW execution_orders_last_30m AS
SELECT * FROM execution_orders
WHERE created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;

-- Signals ↔ orders (30m)
CREATE OR REPLACE VIEW signals_with_orders_last_30m AS
SELECT
  s.id AS signal_id, s.symbol, s.timeframe, s.direction,
  s.price, s.score, COALESCE(s.metadata->>'grade', 'C') AS grade,
  s.created_at AS signal_time,
  eo.id AS order_id, eo.status AS order_status, eo.qty, eo.created_at AS order_time
FROM signals s
LEFT JOIN execution_orders eo ON eo.signal_id = s.id
WHERE s.created_at > NOW() - INTERVAL '30 minutes'
ORDER BY s.created_at DESC, eo.created_at DESC;

-- Heartbeat rollup
CREATE OR REPLACE VIEW system_heartbeat AS
SELECT service_name AS component, status, MAX(last_update) AS last_heartbeat
FROM system_status
GROUP BY service_name, status
ORDER BY MAX(last_update) DESC;

-- KPIs function
CREATE OR REPLACE FUNCTION public.get_debug_kpis()
RETURNS TABLE (
  signals_30m INT,
  orders_30m  INT,
  latest_signal timestamptz,
  latest_order  timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::int FROM signals_last_30m),
    (SELECT COUNT(*)::int FROM execution_orders_last_30m),
    (SELECT MAX(created_at) FROM signals_last_30m),
    (SELECT MAX(created_at) FROM execution_orders_last_30m)
$$;