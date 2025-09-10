-- Check if trading_config table exists, if not create it
CREATE TABLE IF NOT EXISTS public.trading_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  auto_trading_enabled BOOLEAN DEFAULT false,
  max_position_size DECIMAL DEFAULT 100,
  risk_percentage DECIMAL DEFAULT 2,
  stop_loss_percentage DECIMAL DEFAULT 5,
  take_profit_percentage DECIMAL DEFAULT 10,
  testnet_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own trading config" 
ON public.trading_config 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading config" 
ON public.trading_config 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading config" 
ON public.trading_config 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Set default configuration for live trading (disable testnet mode)
INSERT INTO public.trading_config (user_id, auto_trading_enabled, testnet_mode, max_position_size, risk_percentage)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- System default
  true, -- Enable auto trading
  false, -- Disable testnet mode for live trading
  10, -- Small position size for safety
  1 -- Conservative 1% risk
) ON CONFLICT DO NOTHING;