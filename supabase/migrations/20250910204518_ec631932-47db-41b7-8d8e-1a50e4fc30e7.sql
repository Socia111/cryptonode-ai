-- Create only the missing trading tables

-- Create strategy_signals table (if not exists)
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

-- Create trading_config table (if not exists)
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
  symbol_whitelist TEXT[] NOT NULL DEFAULT ARRAY['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trading_risk_state table (if not exists)
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

-- Create trading_positions table (if not exists)
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
  signal_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Insert default trading config if not exists
INSERT INTO public.trading_config (
  auto_trading_enabled,
  paper_mode,
  symbol_whitelist
) 
SELECT false, true, ARRAY['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT', 'ATOMUSDT', 'NEARUSDT']
WHERE NOT EXISTS (SELECT 1 FROM public.trading_config LIMIT 1);

-- Enable RLS on new tables (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'strategy_signals' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'trading_config' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'trading_risk_state' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.trading_risk_state ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'trading_positions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;