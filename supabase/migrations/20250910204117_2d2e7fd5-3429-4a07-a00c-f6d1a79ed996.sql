-- Create missing trading-related tables

-- Create strategy_signals table
CREATE TABLE IF NOT EXISTS public.strategy_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  take_profit NUMERIC NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  pms_score NUMERIC NOT NULL,
  risk_reward_ratio NUMERIC NOT NULL,
  regime TEXT NOT NULL,
  atr NUMERIC NOT NULL,
  indicators JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'executed', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  bar_time TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create trading config table
CREATE TABLE IF NOT EXISTS public.trading_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_trading_enabled BOOLEAN NOT NULL DEFAULT false,
  paper_mode BOOLEAN NOT NULL DEFAULT true,
  risk_per_trade_pct NUMERIC NOT NULL DEFAULT 2.0,
  max_open_risk_pct NUMERIC NOT NULL DEFAULT 10.0,
  daily_loss_limit_pct NUMERIC NOT NULL DEFAULT -5.0,
  max_positions INTEGER NOT NULL DEFAULT 5,
  maker_only BOOLEAN NOT NULL DEFAULT false,
  default_leverage INTEGER NOT NULL DEFAULT 3,
  slippage_tolerance_bps INTEGER NOT NULL DEFAULT 50,
  min_confidence_score NUMERIC NOT NULL DEFAULT 0.75,
  min_risk_reward_ratio NUMERIC NOT NULL DEFAULT 2.0,
  funding_rate_limit_pct NUMERIC NOT NULL DEFAULT 0.1,
  symbol_whitelist JSONB NOT NULL DEFAULT '["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "DOTUSDT"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trading risk state table  
CREATE TABLE IF NOT EXISTS public.trading_risk_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_pnl NUMERIC NOT NULL DEFAULT 0,
  daily_volume NUMERIC NOT NULL DEFAULT 0,
  open_positions INTEGER NOT NULL DEFAULT 0,
  kill_switch_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trading_date)
);

-- Create trading positions table
CREATE TABLE IF NOT EXISTS public.trading_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  size NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  unrealized_pnl NUMERIC DEFAULT 0,
  realized_pnl NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
  bybit_position_id TEXT,
  signal_id UUID REFERENCES public.strategy_signals(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Insert default trading config
INSERT INTO public.trading_config (
  auto_trading_enabled,
  paper_mode,
  symbol_whitelist
) VALUES (
  false,
  true,
  '["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "DOTUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT", "ATOMUSDT", "NEARUSDT"]'::jsonb
) ON CONFLICT DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.trading_risk_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for strategy signals
CREATE POLICY "Service role can manage strategy signals" ON public.strategy_signals
  FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Authenticated users can view strategy signals" ON public.strategy_signals
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create RLS policies for trading config  
CREATE POLICY "Service role can manage trading config" ON public.trading_config
  FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Authenticated users can view trading config" ON public.trading_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create RLS policies for trading risk state
CREATE POLICY "Service role can manage trading risk state" ON public.trading_risk_state
  FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Authenticated users can view trading risk state" ON public.trading_risk_state
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create RLS policies for trading positions
CREATE POLICY "Service role can manage trading positions" ON public.trading_positions
  FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Authenticated users can view trading positions" ON public.trading_positions
  FOR SELECT USING (auth.uid() IS NOT NULL);