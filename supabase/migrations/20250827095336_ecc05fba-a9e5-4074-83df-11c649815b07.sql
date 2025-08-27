-- Create markets table for storing exchange market data
CREATE TABLE public.markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'bybit',
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL,
  price NUMERIC NOT NULL,
  volume_24h NUMERIC DEFAULT 0,
  price_change_24h NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, exchange)
);

-- Create scanner_signals table for AItradeX1 signals
CREATE TABLE public.scanner_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'bybit',
  timeframe TEXT NOT NULL DEFAULT '1h',
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL,
  indicators JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_signals ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can view markets" 
ON public.markets 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view scanner signals" 
ON public.scanner_signals 
FOR SELECT 
USING (true);

-- Create policies for service role management
CREATE POLICY "Service role can manage markets" 
ON public.markets 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage scanner signals" 
ON public.scanner_signals 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_markets_symbol_exchange ON public.markets(symbol, exchange);
CREATE INDEX idx_markets_price ON public.markets(price DESC);
CREATE INDEX idx_markets_volume ON public.markets(volume_24h DESC);

CREATE INDEX idx_scanner_signals_active ON public.scanner_signals(is_active, generated_at DESC);
CREATE INDEX idx_scanner_signals_score ON public.scanner_signals(confidence_score DESC);
CREATE INDEX idx_scanner_signals_symbol ON public.scanner_signals(symbol);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_markets_updated_at
BEFORE UPDATE ON public.markets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-expire old signals (older than 4 hours)
CREATE OR REPLACE FUNCTION auto_expire_signals()
RETURNS void AS $$
BEGIN
  UPDATE public.scanner_signals 
  SET is_active = false 
  WHERE is_active = true 
  AND generated_at < NOW() - INTERVAL '4 hours';
END;
$$ LANGUAGE plpgsql;