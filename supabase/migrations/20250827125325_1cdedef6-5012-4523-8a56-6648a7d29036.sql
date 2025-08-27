-- Add candle lineage tracking to signals table
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS candle_set_id UUID;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_signals_candle_set_id ON public.signals(candle_set_id);

-- Create scans tracking table if not exists
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  signals_found INTEGER DEFAULT 0,
  symbols_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on scans table
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage scans
CREATE POLICY "Service role can manage scans" ON public.scans
FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create candles table for tracking OHLCV data lineage
CREATE TABLE IF NOT EXISTS public.candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  bar_time TIMESTAMPTZ NOT NULL,
  open DECIMAL NOT NULL,
  high DECIMAL NOT NULL,
  low DECIMAL NOT NULL,
  close DECIMAL NOT NULL,
  volume DECIMAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'bybit',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on candles table
ALTER TABLE public.candles ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage candles
CREATE POLICY "Service role can manage candles" ON public.candles
FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_candles_symbol_timeframe_time ON public.candles(symbol, timeframe, bar_time DESC);