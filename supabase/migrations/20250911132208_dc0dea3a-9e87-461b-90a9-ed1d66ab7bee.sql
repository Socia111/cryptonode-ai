-- Create alert_log table for webhook alert deduplication and audit
CREATE TABLE IF NOT EXISTS public.alert_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  event TEXT NOT NULL,               -- e.g. LIVE_ENABLED
  severity TEXT NOT NULL,            -- info|warning|critical
  hash_key TEXT NOT NULL,            -- hash of (event + payload signature)
  context JSONB,
  delivered_to JSONB,                -- {telegram:true, slack:false, ...}
  status TEXT NOT NULL,              -- delivered|skipped|error
  error_msg TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_log_ts ON public.alert_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_hash_key ON public.alert_log (hash_key);

-- Enable RLS
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;

-- Read-only policy for authenticated users
CREATE POLICY "alert_log_ro" ON public.alert_log 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Service role can manage alerts
CREATE POLICY "service_role_alert_log" ON public.alert_log 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);