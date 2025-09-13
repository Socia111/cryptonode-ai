-- Drop conflicting policy first
DROP POLICY IF EXISTS "Service role can manage strategy signals" ON public.strategy_signals;

-- Create tables if they don't exist
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

CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  portfolio_id UUID REFERENCES public.portfolios(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  size NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  unrealized_pnl NUMERIC DEFAULT 0,
  realized_pnl NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL,
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

-- Enable RLS
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for strategy signals" ON public.strategy_signals FOR SELECT USING (true);
CREATE POLICY "Service role can manage strategy signals" ON public.strategy_signals FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can manage their portfolios" ON public.portfolios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their positions" ON public.positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their orders" ON public.orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their trades" ON public.trades FOR ALL USING (auth.uid() = user_id);