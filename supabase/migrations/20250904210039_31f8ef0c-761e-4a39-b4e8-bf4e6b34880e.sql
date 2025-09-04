-- Add missing columns to signals table for auto-trading
ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create trading_configs table if it doesn't exist (for compatibility)
CREATE TABLE IF NOT EXISTS trading_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_trade_enabled BOOLEAN DEFAULT FALSE,
  max_positions INTEGER DEFAULT 3,
  risk_per_trade NUMERIC DEFAULT 2.0,
  min_confidence NUMERIC DEFAULT 80.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on trading_configs
ALTER TABLE trading_configs ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for trading_configs (service role only for now)
CREATE POLICY "Service role can manage trading configs" ON trading_configs
FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Insert default trading config if none exists
INSERT INTO trading_configs (auto_trade_enabled, max_positions, risk_per_trade, min_confidence)
SELECT FALSE, 3, 2.0, 80.0
WHERE NOT EXISTS (SELECT 1 FROM trading_configs LIMIT 1);