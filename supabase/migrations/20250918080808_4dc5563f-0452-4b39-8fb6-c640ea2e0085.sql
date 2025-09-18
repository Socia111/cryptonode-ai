-- Create missing trading_configs table
CREATE TABLE IF NOT EXISTS public.trading_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  exchange TEXT NOT NULL DEFAULT 'bybit',
  account_type TEXT NOT NULL DEFAULT 'testnet',
  auto_trading_enabled BOOLEAN NOT NULL DEFAULT false,
  max_position_size NUMERIC DEFAULT 1000,
  risk_per_trade NUMERIC DEFAULT 0.02,
  stop_loss_enabled BOOLEAN DEFAULT true,
  take_profit_enabled BOOLEAN DEFAULT true,
  leverage NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for trading_configs
CREATE POLICY "Public read access to trading configs" 
ON public.trading_configs 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage trading configs" 
ON public.trading_configs 
FOR ALL 
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Users can manage own trading configs" 
ON public.trading_configs 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_trading_configs_updated_at
BEFORE UPDATE ON public.trading_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();