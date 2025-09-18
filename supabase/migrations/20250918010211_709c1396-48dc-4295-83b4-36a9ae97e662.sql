-- Create live market data table for real-time exchange feeds
CREATE TABLE IF NOT EXISTS public.live_market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL DEFAULT 'USDT',
  price NUMERIC NOT NULL,
  bid NUMERIC,
  ask NUMERIC,
  volume NUMERIC,
  volume_quote NUMERIC,
  change_24h NUMERIC,
  change_24h_percent NUMERIC,
  high_24h NUMERIC,
  low_24h NUMERIC,
  
  -- Technical indicators
  ema21 NUMERIC,
  sma200 NUMERIC,
  volume_avg_20 NUMERIC,
  atr_14 NUMERIC,
  rsi_14 NUMERIC,
  stoch_k NUMERIC,
  stoch_d NUMERIC,
  adx NUMERIC,
  plus_di NUMERIC,
  minus_di NUMERIC,
  
  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(exchange, symbol)
);

-- Enable Row Level Security
ALTER TABLE public.live_market_data ENABLE ROW LEVEL SECURITY;

-- Create policies for live market data
CREATE POLICY "Live market data is publicly readable" 
ON public.live_market_data 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage live market data" 
ON public.live_market_data 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_market_data_exchange_symbol ON public.live_market_data(exchange, symbol);
CREATE INDEX IF NOT EXISTS idx_live_market_data_symbol ON public.live_market_data(symbol);
CREATE INDEX IF NOT EXISTS idx_live_market_data_created_at ON public.live_market_data(created_at);
CREATE INDEX IF NOT EXISTS idx_live_market_data_price ON public.live_market_data(price);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_live_market_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_live_market_data_updated_at
BEFORE UPDATE ON public.live_market_data
FOR EACH ROW
EXECUTE FUNCTION public.update_live_market_data_updated_at();

-- Update existing signals table to include exchange information
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS exchange_source TEXT DEFAULT 'bybit';
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS volume_ratio NUMERIC;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS hvp_value NUMERIC;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS signal_grade TEXT;

-- Add index for signal queries
CREATE INDEX IF NOT EXISTS idx_signals_exchange_source ON public.signals(exchange_source);
CREATE INDEX IF NOT EXISTS idx_signals_signal_grade ON public.signals(signal_grade);

-- Create exchange feed status table
CREATE TABLE IF NOT EXISTS public.exchange_feed_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exchange TEXT NOT NULL UNIQUE,
  last_update TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  symbols_tracked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on feed status
ALTER TABLE public.exchange_feed_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange feed status is publicly readable" 
ON public.exchange_feed_status 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage exchange feed status" 
ON public.exchange_feed_status 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert initial exchange statuses
INSERT INTO public.exchange_feed_status (exchange, status) 
VALUES 
  ('binance', 'active'),
  ('bybit', 'active'),
  ('okx', 'active'),
  ('coinbase', 'active'),
  ('kraken', 'active'),
  ('kucoin', 'active')
ON CONFLICT (exchange) DO NOTHING;