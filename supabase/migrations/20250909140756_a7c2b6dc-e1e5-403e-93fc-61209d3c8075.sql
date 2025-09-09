-- =================== AUTOMATED TRADING TABLES ===================

-- Trading signals storage (enhanced from existing)
CREATE TABLE IF NOT EXISTS public.trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Signal identification
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '5m',
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  
  -- AI scores and indicators
  pms_score NUMERIC(5,3) NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  regime TEXT NOT NULL CHECK (regime IN ('trending', 'ranging', 'unknown')),
  
  -- Price levels
  entry_price NUMERIC(20,8) NOT NULL,
  stop_loss NUMERIC(20,8) NOT NULL,
  take_profit NUMERIC(20,8) NOT NULL,
  risk_reward_ratio NUMERIC(5,2) NOT NULL,
  atr NUMERIC(20,8) NOT NULL,
  
  -- Indicators snapshot
  indicators JSONB NOT NULL DEFAULT '{}',
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'executed', 'rejected', 'expired')),
  rejection_reason TEXT,
  
  -- Auto-trading flags
  auto_trade_eligible BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  UNIQUE(symbol, timeframe, direction, created_at)
);

-- Orders tracking (enhanced)
CREATE TABLE IF NOT EXISTS public.trading_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Order identification
  signal_id UUID REFERENCES public.trading_signals(id) ON DELETE SET NULL,
  exchange_order_id TEXT,
  client_order_id TEXT UNIQUE NOT NULL,
  
  -- Order details
  exchange TEXT NOT NULL DEFAULT 'bybit',
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('Market', 'Limit', 'StopMarket', 'StopLimit')),
  
  -- Quantities and prices
  qty NUMERIC(20,8) NOT NULL,
  price NUMERIC(20,8),
  filled_qty NUMERIC(20,8) DEFAULT 0,
  avg_fill_price NUMERIC(20,8),
  
  -- Order management
  time_in_force TEXT DEFAULT 'PostOnly',
  reduce_only BOOLEAN DEFAULT false,
  leverage INTEGER DEFAULT 1,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'new', 'partiallyFilled', 'filled', 'cancelled', 'rejected')),
  error_message TEXT,
  
  -- Execution metadata
  fees NUMERIC(20,8) DEFAULT 0,
  slippage_bps NUMERIC(8,2),
  execution_latency_ms INTEGER,
  
  -- Raw exchange response
  raw_response JSONB DEFAULT '{}'
);

-- Positions tracking
CREATE TABLE IF NOT EXISTS public.trading_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Position identification
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
  
  -- Position size and prices
  qty NUMERIC(20,8) NOT NULL DEFAULT 0,
  avg_entry_price NUMERIC(20,8),
  mark_price NUMERIC(20,8),
  
  -- P&L tracking
  unrealized_pnl NUMERIC(20,8) DEFAULT 0,
  realized_pnl NUMERIC(20,8) DEFAULT 0,
  
  -- Risk management
  stop_loss NUMERIC(20,8),
  take_profit NUMERIC(20,8),
  trailing_stop NUMERIC(20,8),
  
  -- Position metadata
  leverage INTEGER DEFAULT 1,
  margin_mode TEXT DEFAULT 'cross',
  auto_add_margin BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  
  UNIQUE(symbol, side)
);

-- Risk management state
CREATE TABLE IF NOT EXISTS public.trading_risk_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Daily state (one record per day)
  trading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- PnL tracking
  daily_pnl NUMERIC(20,8) DEFAULT 0,
  daily_fees NUMERIC(20,8) DEFAULT 0,
  open_risk_amount NUMERIC(20,8) DEFAULT 0,
  
  -- Risk controls
  auto_trading_enabled BOOLEAN DEFAULT false,
  kill_switch_triggered BOOLEAN DEFAULT false,
  kill_switch_reason TEXT,
  
  -- Limits
  max_open_risk_pct NUMERIC(5,2) DEFAULT 2.0,
  risk_per_trade_pct NUMERIC(5,2) DEFAULT 0.75,
  daily_loss_limit_pct NUMERIC(5,2) DEFAULT -1.5,
  
  -- Counters
  trades_today INTEGER DEFAULT 0,
  max_positions INTEGER DEFAULT 5,
  
  UNIQUE(trading_date)
);

-- Execution audit log
CREATE TABLE IF NOT EXISTS public.trading_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Log classification
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  scope TEXT NOT NULL, -- 'signal', 'order', 'position', 'risk', 'system'
  
  -- Message and context
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- References
  signal_id UUID REFERENCES public.trading_signals(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.trading_orders(id) ON DELETE SET NULL,
  
  -- Error tracking
  error_code TEXT,
  stack_trace TEXT
);

-- Auto-trading configuration (simplified for single-user)
CREATE TABLE IF NOT EXISTS public.trading_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Trading preferences
  auto_trading_enabled BOOLEAN DEFAULT false,
  paper_mode BOOLEAN DEFAULT true,
  
  -- Risk settings
  risk_per_trade_pct NUMERIC(5,2) DEFAULT 0.75,
  max_open_risk_pct NUMERIC(5,2) DEFAULT 2.0,
  daily_loss_limit_pct NUMERIC(5,2) DEFAULT -1.5,
  max_positions INTEGER DEFAULT 3,
  
  -- Execution settings
  maker_only BOOLEAN DEFAULT true,
  default_leverage INTEGER DEFAULT 1,
  slippage_tolerance_bps INTEGER DEFAULT 10,
  
  -- Filters
  min_confidence_score INTEGER DEFAULT 70,
  min_risk_reward_ratio NUMERIC(5,2) DEFAULT 2.0,
  funding_rate_limit_pct NUMERIC(5,4) DEFAULT 0.05,
  
  -- Whitelisted symbols
  symbol_whitelist TEXT[] DEFAULT ARRAY['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','ADAUSDT','DOTUSDT','LINKUSDT','AVAXUSDT']
);

-- Insert default trading config
INSERT INTO public.trading_config (auto_trading_enabled, paper_mode) 
VALUES (false, true) 
ON CONFLICT DO NOTHING;

-- =================== INDEXES ===================

CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON public.trading_signals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON public.trading_signals(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_trading_signals_auto_eligible ON public.trading_signals(auto_trade_eligible, status);

CREATE INDEX IF NOT EXISTS idx_trading_orders_status ON public.trading_orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_trading_orders_symbol ON public.trading_orders(symbol, side);
CREATE INDEX IF NOT EXISTS idx_trading_orders_client_id ON public.trading_orders(client_order_id);

CREATE INDEX IF NOT EXISTS idx_trading_positions_symbol ON public.trading_positions(symbol, status);
CREATE INDEX IF NOT EXISTS idx_trading_positions_status ON public.trading_positions(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_trading_risk_date ON public.trading_risk_state(trading_date);

CREATE INDEX IF NOT EXISTS idx_trading_log_level ON public.trading_execution_log(level, created_at);
CREATE INDEX IF NOT EXISTS idx_trading_log_scope ON public.trading_execution_log(scope, created_at);

-- =================== TRIGGERS ===================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_trading_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trading_signals_updated_at
  BEFORE UPDATE ON public.trading_signals
  FOR EACH ROW EXECUTE FUNCTION update_trading_updated_at();

CREATE TRIGGER trigger_trading_orders_updated_at
  BEFORE UPDATE ON public.trading_orders
  FOR EACH ROW EXECUTE FUNCTION update_trading_updated_at();

CREATE TRIGGER trigger_trading_positions_updated_at
  BEFORE UPDATE ON public.trading_positions
  FOR EACH ROW EXECUTE FUNCTION update_trading_updated_at();

CREATE TRIGGER trigger_trading_risk_state_updated_at
  BEFORE UPDATE ON public.trading_risk_state
  FOR EACH ROW EXECUTE FUNCTION update_trading_updated_at();

CREATE TRIGGER trigger_trading_config_updated_at
  BEFORE UPDATE ON public.trading_config
  FOR EACH ROW EXECUTE FUNCTION update_trading_updated_at();

-- =================== RLS POLICIES ===================

-- Enable RLS on all tables
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_risk_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
CREATE POLICY "Service role full access on trading_signals" ON public.trading_signals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on trading_orders" ON public.trading_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on trading_positions" ON public.trading_positions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on trading_risk_state" ON public.trading_risk_state
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on trading_execution_log" ON public.trading_execution_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on trading_config" ON public.trading_config
  FOR ALL USING (auth.role() = 'service_role');

-- Public read access for now (can be restricted later)
CREATE POLICY "Users can view trading data" ON public.trading_signals
  FOR SELECT USING (true);

CREATE POLICY "Users can view trading orders" ON public.trading_orders
  FOR SELECT USING (true);

CREATE POLICY "Users can view trading positions" ON public.trading_positions
  FOR SELECT USING (true);

CREATE POLICY "Users can view risk state" ON public.trading_risk_state
  FOR SELECT USING (true);

CREATE POLICY "Users can view execution logs" ON public.trading_execution_log
  FOR SELECT USING (true);

CREATE POLICY "Users can view trading config" ON public.trading_config
  FOR SELECT USING (true);