-- First add the missing aira_rank column to signals table
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS aira_rank INTEGER;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS aira_boost_applied NUMERIC DEFAULT 0;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS bar_time TIMESTAMP WITH TIME ZONE;

-- Update bar_time for existing records if null
UPDATE public.signals 
SET bar_time = created_at 
WHERE bar_time IS NULL;

-- Database safety nets for AItradeX1 signals

-- Prevent spam on same bar/direction
CREATE UNIQUE INDEX IF NOT EXISTS ux_signals_bar
ON public.signals (exchange, symbol, timeframe, direction, bar_time);

-- Speed dashboards / filters  
CREATE INDEX IF NOT EXISTS ix_signals_recent
ON public.signals (created_at DESC);

CREATE INDEX IF NOT EXISTS ix_signals_symbol_tf
ON public.signals (exchange, symbol, timeframe, created_at DESC);

-- Index for AIRA rankings lookups
CREATE INDEX IF NOT EXISTS ix_signals_aira_rank
ON public.signals (aira_rank) WHERE aira_rank IS NOT NULL;