-- Ensure signals table has proper structure and constraints
CREATE TABLE IF NOT EXISTS public.signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  algo TEXT NOT NULL DEFAULT 'AItradeX1',
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL,
  bar_time TIMESTAMPTZ NOT NULL,
  price NUMERIC NOT NULL,
  score NUMERIC NOT NULL,
  sl NUMERIC,
  tp NUMERIC,
  indicators JSONB DEFAULT '{}',
  atr NUMERIC,
  hvp NUMERIC,
  filters JSONB DEFAULT '{}',
  relaxed_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS uniq_signal_bar
ON public.signals (exchange, symbol, timeframe, direction, bar_time);

-- Helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_signals_recent 
ON public.signals (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_symbol_tf
ON public.signals (symbol, timeframe, created_at DESC);

-- Enable RLS
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "signals_read_public" ON public.signals;
DROP POLICY IF EXISTS "signals_write_service" ON public.signals;
DROP POLICY IF EXISTS "Service role can manage signals" ON public.signals;

-- Allow public read access for dashboard
CREATE POLICY "signals_read_public"
ON public.signals FOR SELECT
TO anon, authenticated
USING (true);

-- Only service role can write signals (from edge functions)
CREATE POLICY "signals_write_service"
ON public.signals FOR INSERT
TO service_role
WITH CHECK (true);

-- Service role can also update/delete if needed
CREATE POLICY "signals_manage_service"
ON public.signals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);