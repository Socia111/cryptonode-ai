-- Create user_trading_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL DEFAULT 'bybit',
  account_type TEXT NOT NULL DEFAULT 'testnet' CHECK (account_type IN ('testnet', 'mainnet')),
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  balance_info JSONB,
  permissions TEXT[] DEFAULT ARRAY['read', 'trade'],
  risk_settings JSONB DEFAULT '{"maxPositionSize": 1000, "stopLossEnabled": true, "takeProfitEnabled": true}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exchange)
);

-- Enable Row Level Security
ALTER TABLE public.user_trading_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own trading accounts" 
ON public.user_trading_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading accounts" 
ON public.user_trading_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading accounts" 
ON public.user_trading_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading accounts" 
ON public.user_trading_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_user_trading_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_trading_accounts_updated_at
BEFORE UPDATE ON public.user_trading_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_user_trading_accounts_updated_at();