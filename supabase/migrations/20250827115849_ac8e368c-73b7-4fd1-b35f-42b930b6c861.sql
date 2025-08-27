-- Ensure all required tables exist for AItradeX1 Live Scanner

-- Core signals (immutable, idempotent on closed bar)
CREATE TABLE IF NOT EXISTS public.signals (
  id            bigserial primary key,
  algo          text not null default 'AItradeX1',
  exchange      text not null,
  symbol        text not null,
  timeframe     text not null,
  direction     text not null check (direction in ('LONG','SHORT')),
  bar_time      timestamptz not null,
  price         double precision not null,
  score         double precision not null,
  atr           double precision,
  sl            double precision,
  tp            double precision,
  hvp           double precision,
  filters       jsonb not null,
  indicators    jsonb not null,
  relaxed_mode  boolean default false,
  created_at    timestamptz not null default now(),
  unique(exchange, symbol, timeframe, direction, bar_time)
);

-- Enable RLS for signals
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Create policies for signals
CREATE POLICY "Anyone can view signals" ON public.signals FOR SELECT USING (true);
CREATE POLICY "Service role can manage signals" ON public.signals FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Index for performance
CREATE INDEX IF NOT EXISTS signals_created_idx ON public.signals(created_at DESC);
CREATE INDEX IF NOT EXISTS signals_symbol_idx ON public.signals(symbol, timeframe, created_at DESC);

-- Dedupe/last emission state per key
CREATE TABLE IF NOT EXISTS public.signals_state (
  exchange      text not null,
  symbol        text not null,
  timeframe     text not null,
  direction     text not null,
  last_emitted  timestamptz not null,
  last_price    double precision,
  last_score    double precision,
  primary key (exchange, symbol, timeframe, direction)
);

-- Enable RLS for signals_state
ALTER TABLE public.signals_state ENABLE ROW LEVEL SECURITY;

-- Create policy for signals_state
CREATE POLICY "Service role can manage signals state" ON public.signals_state FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Deliveries (outbound)
CREATE TABLE IF NOT EXISTS public.alerts_log (
  id           bigserial primary key,
  signal_id    bigint references public.signals(id) on delete cascade,
  channel      text not null, -- telegram | webhook | discord
  payload      jsonb not null,
  status       text not null, -- sent | failed
  response     jsonb,
  created_at   timestamptz not null default now()
);

-- Enable RLS for alerts_log
ALTER TABLE public.alerts_log ENABLE ROW LEVEL SECURITY;

-- Create policy for alerts_log
CREATE POLICY "Service role can manage alerts log" ON public.alerts_log FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Errors/diagnostics
CREATE TABLE IF NOT EXISTS public.errors_log (
  id           bigserial primary key,
  where_at     text not null,
  symbol       text,
  details      jsonb,
  created_at   timestamptz not null default now()
);

-- Enable RLS for errors_log
ALTER TABLE public.errors_log ENABLE ROW LEVEL SECURITY;

-- Create policy for errors_log
CREATE POLICY "Service role can manage errors log" ON public.errors_log FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Scanning runs
CREATE TABLE IF NOT EXISTS public.scans (
  id            bigserial primary key,
  exchange      text not null,
  timeframe     text not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  symbols_count int,
  signals_count int,
  relaxed_mode  boolean default false
);

-- Enable RLS for scans
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Create policy for scans
CREATE POLICY "Anyone can view scans" ON public.scans FOR SELECT USING (true);
CREATE POLICY "Service role can manage scans" ON public.scans FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Backtest results (backtest-engine writes here)
CREATE TABLE IF NOT EXISTS public.backtest_results (
  id               bigserial primary key,
  strategy         text not null,
  symbol           text not null,
  timeframe        text not null,
  start_date       timestamptz,
  end_date         timestamptz,
  initial_capital  double precision,
  results          jsonb not null,
  created_at       timestamptz not null default now()
);

-- Enable RLS for backtest_results
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

-- Create policy for backtest_results
CREATE POLICY "Anyone can view backtest results" ON public.backtest_results FOR SELECT USING (true);
CREATE POLICY "Service role can manage backtest results" ON public.backtest_results FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);