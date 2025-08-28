-- Create alerts_log table for Telegram audit logging
CREATE TABLE IF NOT EXISTS public.alerts_log (
  id bigserial primary key,
  channel text not null,
  symbol text not null,
  timeframe text not null,
  direction text not null,
  status text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Create indexes for alerts_log
CREATE INDEX IF NOT EXISTS ix_alerts_log_recent
  ON public.alerts_log(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_alerts_log_status
  ON public.alerts_log(channel, status, created_at DESC);

-- Ensure aira_rankings table exists with proper structure
CREATE TABLE IF NOT EXISTS public.aira_rankings (
  id bigserial primary key,
  symbol text unique,
  aira_score double precision,
  market_cap double precision,
  liquidity_score double precision,
  smart_money_flows double precision,
  sentiment_score double precision,
  on_chain_activity double precision,
  holder_distribution double precision,
  ml_pattern_score double precision,
  quantum_probability double precision,
  rank int,
  updated_at timestamptz default now()
);

-- Add helpful indexes for signals if not exist
CREATE INDEX IF NOT EXISTS ix_signals_recent
  ON public.signals(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_signals_query
  ON public.signals(exchange, symbol, timeframe, created_at DESC);

-- Enable RLS on alerts_log
ALTER TABLE public.alerts_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for alerts_log
CREATE POLICY "Service role can manage alerts log"
  ON public.alerts_log
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);