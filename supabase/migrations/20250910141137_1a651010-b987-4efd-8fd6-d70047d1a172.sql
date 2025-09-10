-- Create trading configuration table
CREATE TABLE IF NOT EXISTS public.trading_config (
  id SERIAL PRIMARY KEY,
  auto_trading_enabled BOOLEAN DEFAULT FALSE,
  paper_mode BOOLEAN DEFAULT TRUE,
  risk_per_trade_pct DECIMAL(5,2) DEFAULT 0.75,
  max_open_risk_pct DECIMAL(5,2) DEFAULT 2.0,
  daily_loss_limit_pct DECIMAL(5,2) DEFAULT -5.0,
  max_positions INTEGER DEFAULT 3,
  maker_only BOOLEAN DEFAULT TRUE,
  default_leverage INTEGER DEFAULT 1,
  slippage_tolerance_bps INTEGER DEFAULT 10,
  min_confidence_score INTEGER DEFAULT 70,
  min_risk_reward_ratio DECIMAL(3,2) DEFAULT 1.5,
  funding_rate_limit_pct DECIMAL(5,2) DEFAULT 0.1,
  symbol_whitelist TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY;

-- Create policy for trading config access
CREATE POLICY "Anyone can view trading config" ON public.trading_config
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify trading config" ON public.trading_config
  FOR ALL USING (auth.role() = 'service_role');

-- Create trading risk state table
CREATE TABLE IF NOT EXISTS public.trading_risk_state (
  id SERIAL PRIMARY KEY,
  trading_date DATE DEFAULT CURRENT_DATE,
  daily_pnl DECIMAL(15,8) DEFAULT 0,
  kill_switch_triggered BOOLEAN DEFAULT FALSE,
  kill_switch_reason TEXT,
  auto_trading_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trading_risk_state ENABLE ROW LEVEL SECURITY;

-- Create policies for risk state
CREATE POLICY "Anyone can view risk state" ON public.trading_risk_state
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify risk state" ON public.trading_risk_state
  FOR ALL USING (auth.role() = 'service_role');

-- Create trading positions table
CREATE TABLE IF NOT EXISTS public.trading_positions (
  id SERIAL PRIMARY KEY,
  signal_id INTEGER,
  exchange_position_id TEXT,
  exchange TEXT DEFAULT 'bybit',
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
  qty DECIMAL(20,8) NOT NULL,
  avg_entry_price DECIMAL(20,8),
  unrealized_pnl DECIMAL(15,8) DEFAULT 0,
  leverage INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for positions
CREATE POLICY "Anyone can view positions" ON public.trading_positions
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify positions" ON public.trading_positions
  FOR ALL USING (auth.role() = 'service_role');

-- Create trading orders table
CREATE TABLE IF NOT EXISTS public.trading_orders (
  id SERIAL PRIMARY KEY,
  signal_id INTEGER,
  exchange_order_id TEXT,
  client_order_id TEXT,
  exchange TEXT DEFAULT 'bybit',
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('Market', 'Limit')),
  qty DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8),
  time_in_force TEXT DEFAULT 'GTC',
  leverage INTEGER DEFAULT 1,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'pending', 'partiallyFilled', 'filled', 'cancelled', 'rejected')),
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trading_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Anyone can view orders" ON public.trading_orders
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify orders" ON public.trading_orders
  FOR ALL USING (auth.role() = 'service_role');

-- Create trading signals table
CREATE TABLE IF NOT EXISTS public.trading_signals (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  pms_score DECIMAL(10,6),
  confidence_score INTEGER,
  regime TEXT,
  entry_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  risk_reward_ratio DECIMAL(6,3),
  atr DECIMAL(20,8),
  indicators JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'executed', 'cancelled')),
  auto_trade_eligible BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

-- Create policies for trading signals
CREATE POLICY "Anyone can view trading signals" ON public.trading_signals
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify trading signals" ON public.trading_signals
  FOR ALL USING (auth.role() = 'service_role');

-- Create trading execution log table
CREATE TABLE IF NOT EXISTS public.trading_execution_log (
  id SERIAL PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  scope TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  signal_id INTEGER,
  order_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trading_execution_log ENABLE ROW LEVEL SECURITY;

-- Create policies for execution log
CREATE POLICY "Anyone can view execution log" ON public.trading_execution_log
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify execution log" ON public.trading_execution_log
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default trading config if none exists
INSERT INTO public.trading_config (id) 
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM public.trading_config WHERE id = 1);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables
DROP TRIGGER IF EXISTS update_trading_config_updated_at ON public.trading_config;
CREATE TRIGGER update_trading_config_updated_at
  BEFORE UPDATE ON public.trading_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_risk_state_updated_at ON public.trading_risk_state;
CREATE TRIGGER update_trading_risk_state_updated_at
  BEFORE UPDATE ON public.trading_risk_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_positions_updated_at ON public.trading_positions;
CREATE TRIGGER update_trading_positions_updated_at
  BEFORE UPDATE ON public.trading_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_orders_updated_at ON public.trading_orders;
CREATE TRIGGER update_trading_orders_updated_at
  BEFORE UPDATE ON public.trading_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_signals_updated_at ON public.trading_signals;
CREATE TRIGGER update_trading_signals_updated_at
  BEFORE UPDATE ON public.trading_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();