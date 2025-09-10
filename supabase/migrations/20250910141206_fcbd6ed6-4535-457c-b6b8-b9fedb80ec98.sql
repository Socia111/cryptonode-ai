-- Create trading configuration table
CREATE TABLE IF NOT EXISTS public.trading_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
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

-- Insert default trading config if none exists
INSERT INTO public.trading_config (
  id, auto_trading_enabled, paper_mode, risk_per_trade_pct, 
  max_open_risk_pct, daily_loss_limit_pct, max_positions, 
  maker_only, default_leverage, min_confidence_score, min_risk_reward_ratio
) 
SELECT 1, FALSE, TRUE, 0.75, 2.0, -5.0, 3, TRUE, 1, 70, 1.5
WHERE NOT EXISTS (SELECT 1 FROM public.trading_config WHERE id = 1);

-- Enable RLS
ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY;

-- Create policy for trading config access
CREATE POLICY "Anyone can view trading config" ON public.trading_config
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify trading config" ON public.trading_config
  FOR ALL USING (auth.role() = 'service_role');