-- Create required tables for the trading system

-- Exchanges table
CREATE TABLE IF NOT EXISTS public.exchanges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Markets table
CREATE TABLE IF NOT EXISTS public.markets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exchange_id UUID REFERENCES public.exchanges(id),
  symbol TEXT NOT NULL,
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exchange_id, symbol)
);

-- Strategy signals table
CREATE TABLE IF NOT EXISTS public.strategy_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  confidence_score NUMERIC,
  signal_strength TEXT DEFAULT 'MEDIUM',
  risk_level TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Positions table
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  portfolio_id UUID REFERENCES public.portfolios(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'Buy' or 'Sell'
  size NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  unrealized_pnl NUMERIC DEFAULT 0,
  realized_pnl NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'Buy' or 'Sell'
  order_type TEXT NOT NULL, -- 'Market', 'Limit', etc.
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  filled_quantity NUMERIC DEFAULT 0,
  average_fill_price NUMERIC,
  status TEXT DEFAULT 'pending',
  exchange_order_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  order_id UUID REFERENCES public.orders(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  fee_currency TEXT,
  exchange_trade_id TEXT,
  executed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Exchanges and markets are public read
CREATE POLICY "Public read access for exchanges" ON public.exchanges FOR SELECT USING (true);
CREATE POLICY "Public read access for markets" ON public.markets FOR SELECT USING (true);

-- Strategy signals are public read
CREATE POLICY "Public read access for strategy signals" ON public.strategy_signals FOR SELECT USING (true);
CREATE POLICY "Service role can manage strategy signals" ON public.strategy_signals FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User-specific data policies
CREATE POLICY "Users can manage their portfolios" ON public.portfolios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their positions" ON public.positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their orders" ON public.orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- Insert default exchanges
INSERT INTO public.exchanges (name, slug) VALUES 
  ('Bybit', 'bybit'),
  ('Binance', 'binance')
ON CONFLICT (slug) DO NOTHING;

-- Insert some default markets for Bybit
INSERT INTO public.markets (exchange_id, symbol, base_asset, quote_asset) 
SELECT e.id, 'BTCUSDT', 'BTC', 'USDT' FROM public.exchanges e WHERE e.slug = 'bybit'
ON CONFLICT (exchange_id, symbol) DO NOTHING;

INSERT INTO public.markets (exchange_id, symbol, base_asset, quote_asset) 
SELECT e.id, 'ETHUSDT', 'ETH', 'USDT' FROM public.exchanges e WHERE e.slug = 'bybit'
ON CONFLICT (exchange_id, symbol) DO NOTHING;