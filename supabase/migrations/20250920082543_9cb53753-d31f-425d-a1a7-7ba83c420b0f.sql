-- Create live_prices table for real-time price tracking
CREATE TABLE IF NOT EXISTS public.live_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  price DECIMAL(20,8) NOT NULL,
  change_24h DECIMAL(10,4),
  volume_24h DECIMAL(20,8),
  high_24h DECIMAL(20,8),
  low_24h DECIMAL(20,8),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'bybit_ws',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for live_prices
CREATE POLICY "Live prices are viewable by everyone" 
ON public.live_prices 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage live prices" 
ON public.live_prices 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_live_prices_symbol ON public.live_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_live_prices_updated ON public.live_prices(last_updated DESC);

-- Add to realtime publication
ALTER publication supabase_realtime ADD TABLE live_prices;