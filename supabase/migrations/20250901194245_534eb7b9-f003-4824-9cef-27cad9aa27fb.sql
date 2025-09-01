-- Enable realtime for signals table
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Add signals table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- Create missing signals table if it doesn't exist with proper structure
CREATE TABLE IF NOT EXISTS public.signals (
  id BIGSERIAL PRIMARY KEY,
  algo TEXT DEFAULT 'AItradeX1',
  exchange TEXT DEFAULT 'bybit',
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  bar_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  atr DOUBLE PRECISION,
  sl DOUBLE PRECISION,
  tp DOUBLE PRECISION,
  hvp DOUBLE PRECISION,
  filters JSONB DEFAULT '{}',
  indicators JSONB DEFAULT '{}',
  relaxed_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aira_rank INTEGER,
  aira_boost_applied NUMERIC,
  
  -- Add unique constraint to prevent duplicates
  UNIQUE(exchange, symbol, timeframe, direction, bar_time)
);

-- Enable RLS
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Create policies for signals table
DROP POLICY IF EXISTS "signals_read_authenticated" ON public.signals;
DROP POLICY IF EXISTS "signals_insert_service_role" ON public.signals;

CREATE POLICY "signals_read_authenticated" ON public.signals
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "signals_insert_service_role" ON public.signals
FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'service_role'::text
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_signals_score_created ON public.signals(score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_symbol_timeframe ON public.signals(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals(created_at DESC);