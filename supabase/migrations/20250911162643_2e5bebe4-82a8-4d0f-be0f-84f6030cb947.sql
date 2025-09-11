-- Create user_trading_accounts table for storing trading platform credentials
CREATE TABLE public.user_trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exchange TEXT NOT NULL, -- 'bybit', '3commas', etc.
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL, -- Should be encrypted in production
  account_type TEXT, -- 'testnet', 'mainnet', etc.
  account_info JSONB,
  balance_info JSONB,
  permissions TEXT[],
  risk_settings JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_trading_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for secure access
CREATE POLICY "Users can view their own trading accounts" 
ON public.user_trading_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading accounts" 
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
CREATE OR REPLACE FUNCTION public.update_updated_at_trading_accounts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trading_accounts_updated_at
  BEFORE UPDATE ON public.user_trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_trading_accounts();