-- Fix app_settings RLS policies for anonymous/authenticated users
DROP POLICY IF EXISTS "app_settings_service_manage" ON app_settings;

-- Allow authenticated users to read app_settings
CREATE POLICY "app_settings_read_authenticated" 
ON app_settings 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow authenticated users to manage their settings
CREATE POLICY "app_settings_upsert_authenticated" 
ON app_settings 
FOR ALL 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Add missing risk column to signals table
ALTER TABLE signals ADD COLUMN IF NOT EXISTS risk numeric DEFAULT 1.0;

-- Add missing risk column to signals_archive table  
ALTER TABLE signals_archive ADD COLUMN IF NOT EXISTS risk numeric DEFAULT 1.0;

-- Update signals table to include better metadata structure
ALTER TABLE signals ADD COLUMN IF NOT EXISTS algorithm_version text DEFAULT 'v1.0';
ALTER TABLE signals ADD COLUMN IF NOT EXISTS market_conditions jsonb DEFAULT '{}';
ALTER TABLE signals ADD COLUMN IF NOT EXISTS execution_priority integer DEFAULT 50;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_signals_risk ON signals(risk);
CREATE INDEX IF NOT EXISTS idx_signals_execution_priority ON signals(execution_priority);
CREATE INDEX IF NOT EXISTS idx_signals_algorithm_version ON signals(algorithm_version);

-- Update RLS policies for better signal access
DROP POLICY IF EXISTS "Public read live active signals" ON signals;
CREATE POLICY "Public read live active signals" 
ON signals 
FOR SELECT 
USING (
  (is_active = true) 
  AND ((expires_at IS NULL) OR (expires_at > now()))
  AND (score >= 60)
);

-- Create automated trading configuration table
CREATE TABLE IF NOT EXISTS automated_trading_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  enabled boolean DEFAULT false,
  max_concurrent_trades integer DEFAULT 3,
  max_daily_trades integer DEFAULT 10,
  risk_per_trade numeric DEFAULT 0.02,
  min_signal_score integer DEFAULT 75,
  preferred_timeframes text[] DEFAULT ARRAY['15m', '30m', '1h'],
  excluded_symbols text[] DEFAULT ARRAY[]::text[],
  trading_hours jsonb DEFAULT '{"start": "00:00", "end": "23:59", "timezone": "UTC"}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on automated trading config
ALTER TABLE automated_trading_config ENABLE ROW LEVEL SECURITY;

-- Create policies for automated trading config
CREATE POLICY "Users can manage own trading config" 
ON automated_trading_config 
FOR ALL 
USING (auth.uid() = user_id OR auth.role() = 'service_role')
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Create trading execution log table
CREATE TABLE IF NOT EXISTS trading_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  signal_id uuid REFERENCES signals(id),
  symbol text NOT NULL,
  side text NOT NULL,
  amount_usd numeric NOT NULL,
  leverage integer DEFAULT 1,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  status text DEFAULT 'pending',
  exchange_order_id text,
  exchange_response jsonb,
  error_message text,
  executed_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on trading executions
ALTER TABLE trading_executions ENABLE ROW LEVEL SECURITY;

-- Create policies for trading executions
CREATE POLICY "Users can view own executions" 
ON trading_executions 
FOR SELECT 
USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service can manage all executions" 
ON trading_executions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');