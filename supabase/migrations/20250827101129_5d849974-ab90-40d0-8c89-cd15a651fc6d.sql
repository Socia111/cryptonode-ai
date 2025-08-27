-- Create scanner_signals table for AItradeX1 scanner
CREATE TABLE IF NOT EXISTS public.scanner_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  confidence_score NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  indicators JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  telegram_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scanner_signals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view scanner signals"
ON public.scanner_signals
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage scanner signals"
ON public.scanner_signals
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scanner_signals_symbol ON public.scanner_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_scanner_signals_confidence ON public.scanner_signals(confidence_score);
CREATE INDEX IF NOT EXISTS idx_scanner_signals_generated_at ON public.scanner_signals(generated_at);
CREATE INDEX IF NOT EXISTS idx_scanner_signals_active ON public.scanner_signals(is_active);
CREATE INDEX IF NOT EXISTS idx_scanner_signals_telegram_sent ON public.scanner_signals(telegram_sent);