-- Step 1: Clean up and rebuild trading system tables

-- Drop problematic tables if they exist
DROP TABLE IF EXISTS trading_configs CASCADE;
DROP TABLE IF EXISTS trading_config CASCADE;

-- Create main user trading configurations table
CREATE TABLE IF NOT EXISTS public.user_trading_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  auto_execute_enabled BOOLEAN DEFAULT false,
  max_position_size NUMERIC DEFAULT 100.0,
  risk_per_trade NUMERIC DEFAULT 2.0,
  max_open_positions INTEGER DEFAULT 3,
  min_confidence_score INTEGER DEFAULT 80,
  timeframes TEXT[] DEFAULT ARRAY['15m', '30m'],
  symbols_blacklist TEXT[] DEFAULT ARRAY['USDCUSDT'],
  use_leverage BOOLEAN DEFAULT false,
  leverage_amount INTEGER DEFAULT 1,
  paper_mode BOOLEAN DEFAULT true,
  daily_loss_limit NUMERIC DEFAULT 100.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trading positions table
CREATE TABLE IF NOT EXISTS public.trading_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  signal_id BIGINT,
  exchange TEXT NOT NULL DEFAULT 'bybit',
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  entry_price NUMERIC,
  current_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  leverage INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open',
  external_order_id TEXT,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  pnl NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trading orders table  
CREATE TABLE IF NOT EXISTS public.trading_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  position_id UUID,
  signal_id BIGINT,
  exchange TEXT NOT NULL DEFAULT 'bybit',
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'market',
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  status TEXT DEFAULT 'pending',
  external_order_id TEXT,
  order_link_id TEXT,
  filled_quantity NUMERIC DEFAULT 0,
  avg_fill_price NUMERIC,
  fees NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Create Bybit credentials table (encrypted)
CREATE TABLE IF NOT EXISTS public.bybit_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_verified TIMESTAMP WITH TIME ZONE,
  account_type TEXT DEFAULT 'UNIFIED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_trading_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bybit_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own trading configs" ON public.user_trading_configs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own positions" ON public.trading_positions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders" ON public.trading_orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own credentials" ON public.bybit_credentials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role policies for automation
CREATE POLICY "Service role can manage all trading data" ON public.user_trading_configs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all positions" ON public.trading_positions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all orders" ON public.trading_orders
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can access credentials" ON public.bybit_credentials
  FOR SELECT USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_trading_configs_user_id ON public.user_trading_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_positions_user_id ON public.trading_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_positions_status ON public.trading_positions(status);
CREATE INDEX IF NOT EXISTS idx_trading_orders_user_id ON public.trading_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_orders_status ON public.trading_orders(status);
CREATE INDEX IF NOT EXISTS idx_bybit_credentials_user_id ON public.bybit_credentials(user_id, is_active);

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_trading_configs_updated_at BEFORE UPDATE ON public.user_trading_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_positions_updated_at BEFORE UPDATE ON public.trading_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_orders_updated_at BEFORE UPDATE ON public.trading_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bybit_credentials_updated_at BEFORE UPDATE ON public.bybit_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();