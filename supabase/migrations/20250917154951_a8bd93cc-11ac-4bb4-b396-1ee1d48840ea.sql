-- Fix signals table RLS policies to allow proper access
DROP POLICY IF EXISTS "read_active_signals" ON public.signals;
DROP POLICY IF EXISTS "Service role full management" ON public.signals;
DROP POLICY IF EXISTS "Service role can manage all signals" ON public.signals;

-- Create comprehensive RLS policies for signals table
CREATE POLICY "Allow anonymous read access to active signals" 
ON public.signals 
FOR SELECT 
USING (
  ((expires_at IS NULL) OR (expires_at > now())) 
  AND (created_at > (now() - '7 days'::interval))
);

CREATE POLICY "Service role can manage all signals" 
ON public.signals 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Create missing markets table
CREATE TABLE IF NOT EXISTS public.markets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL UNIQUE,
  exchange text NOT NULL DEFAULT 'bybit',
  base_asset text NOT NULL,
  quote_asset text NOT NULL DEFAULT 'USDT',
  status text NOT NULL DEFAULT 'active',
  min_order_size numeric,
  max_order_size numeric,
  price_precision integer DEFAULT 4,
  quantity_precision integer DEFAULT 8,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on markets table
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for markets table
CREATE POLICY "Anyone can view active markets" 
ON public.markets 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Service role can manage markets" 
ON public.markets 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Insert some basic market data
INSERT INTO public.markets (symbol, base_asset, quote_asset, status) VALUES
('BTCUSDT', 'BTC', 'USDT', 'active'),
('ETHUSDT', 'ETH', 'USDT', 'active'),
('SOLUSDT', 'SOL', 'USDT', 'active'),
('ADAUSDT', 'ADA', 'USDT', 'active'),
('DOTUSDT', 'DOT', 'USDT', 'active'),
('LINKUSDT', 'LINK', 'USDT', 'active'),
('BNBUSDT', 'BNB', 'USDT', 'active'),
('XRPUSDT', 'XRP', 'USDT', 'active'),
('MATICUSDT', 'MATIC', 'USDT', 'active'),
('AVAXUSDT', 'AVAX', 'USDT', 'active')
ON CONFLICT (symbol) DO NOTHING;

-- Add trigger for updated_at on markets table
CREATE TRIGGER update_markets_updated_at
BEFORE UPDATE ON public.markets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();