-- Drop all existing signal policies
DROP POLICY IF EXISTS "signals_read_public" ON public.signals;
DROP POLICY IF EXISTS "signals_write_service" ON public.signals;
DROP POLICY IF EXISTS "signals_manage_service" ON public.signals;
DROP POLICY IF EXISTS "Service role can manage signals" ON public.signals;
DROP POLICY IF EXISTS "signals_read_own_or_public" ON public.signals;
DROP POLICY IF EXISTS "signals_write_self" ON public.signals;

-- Ensure signals table has the required columns for AItradeX1
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS atr NUMERIC;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS hvp NUMERIC;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}';
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS relaxed_mode BOOLEAN DEFAULT false;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS bar_time TIMESTAMPTZ;

-- Create unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS uniq_signal_bar
ON public.signals (exchange, symbol, timeframe, direction, bar_time);

-- Helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_signals_recent 
ON public.signals (created_at DESC);

-- Enable RLS
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

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

-- Service role full access
CREATE POLICY "signals_service_all"
ON public.signals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);