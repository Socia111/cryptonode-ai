-- Fix the trading_configs table structure
DROP TABLE IF EXISTS trading_configs;

-- Create proper trading_configs table matching the user_trading_configs structure
CREATE TABLE trading_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_trade_enabled BOOLEAN DEFAULT FALSE,
  max_open_positions INTEGER DEFAULT 3,
  risk_per_trade NUMERIC DEFAULT 2.0,
  min_confidence_score NUMERIC DEFAULT 80.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on trading_configs
ALTER TABLE trading_configs ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for trading_configs
CREATE POLICY "Service role can manage trading configs" ON trading_configs
FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Insert default trading config
INSERT INTO trading_configs (auto_trade_enabled, max_open_positions, risk_per_trade, min_confidence_score)
VALUES (FALSE, 3, 2.0, 80.0);