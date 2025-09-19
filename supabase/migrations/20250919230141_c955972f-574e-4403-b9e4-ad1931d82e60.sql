-- Go-Live Database Setup (Part 2)
-- Drop existing views first
DROP VIEW IF EXISTS signals_last_30m CASCADE;
DROP VIEW IF EXISTS signals_live CASCADE;
DROP VIEW IF EXISTS execution_orders_last_30m CASCADE;
DROP VIEW IF EXISTS signals_with_orders_last_30m CASCADE;
DROP VIEW IF EXISTS system_heartbeat CASCADE;

-- Update system status for live mode
INSERT INTO system_status (service_name, status, metadata)
VALUES 
  ('signal_engine', 'active', '{"mode": "live", "threshold": 60}'::jsonb),
  ('trade_executor', 'active', '{"mode": "live", "consensus": false}'::jsonb),
  ('live_scanner', 'active', '{"symbols": 50, "interval": "2min"}'::jsonb)
ON CONFLICT (service_name) 
DO UPDATE SET 
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  last_update = now();

-- Realtime publication setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.execution_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_status;

-- Grant permissions for realtime
GRANT SELECT ON public.signals TO anon, authenticated;
GRANT SELECT ON public.execution_orders TO anon, authenticated;
GRANT SELECT ON public.system_status TO anon, authenticated;