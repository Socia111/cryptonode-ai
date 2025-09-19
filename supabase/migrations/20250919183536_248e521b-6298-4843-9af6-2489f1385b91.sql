-- **PHASE 5: AUTOMATED TRADING SYSTEM ACTIVATION**

-- 1. Create whitelist settings table for comprehensive symbol management
CREATE TABLE IF NOT EXISTS public.whitelist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whitelist_enabled BOOLEAN NOT NULL DEFAULT false,
  whitelist_pairs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  max_symbols INTEGER NOT NULL DEFAULT 100,
  auto_update BOOLEAN NOT NULL DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whitelist_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for whitelist settings
CREATE POLICY "Public read access to whitelist settings" 
ON public.whitelist_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage whitelist settings" 
ON public.whitelist_settings 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 2. Insert default whitelist configuration with ALL major USDT pairs
INSERT INTO public.whitelist_settings (
  whitelist_enabled, 
  whitelist_pairs, 
  max_symbols, 
  auto_update
) VALUES (
  true,
  ARRAY[
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT', 
    'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT',
    'UNIUSDT', 'FILUSDT', 'TRXUSDT', 'ETCUSDT', 'XLMUSDT', 'VETUSDT',
    'ICPUSDT', 'AAVEUSDT', 'EOSUSDT', 'XTZUSDT', 'ALGOUSDT', 'MKRUSDT',
    'COMPUSDT', 'YFIUSDT', 'SUSHIUSDT', 'SNXUSDT', 'CRVUSDT', 'UMAUSDT',
    'RENUSDT', 'KNCUSDT', 'ZRXUSDT', 'STORJUSDT', 'BANDUSDT', 'BALUSDT'
  ],
  100,
  true
) ON CONFLICT DO NOTHING;

-- 3. Update automated trading config table with enhanced settings
ALTER TABLE public.automated_trading_config 
ADD COLUMN IF NOT EXISTS credit_allowance INTEGER DEFAULT 250,
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_trade_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS active_exchanges TEXT[] DEFAULT ARRAY['bybit', 'binance', 'okx'];

-- 4. Create trading statistics tracking
CREATE TABLE IF NOT EXISTS public.trading_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  trades_executed INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  total_pnl DECIMAL(15,4) DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  active_positions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.trading_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for trading stats
CREATE POLICY "Users can view own trading stats" 
ON public.trading_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own trading stats" 
ON public.trading_stats 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all trading stats" 
ON public.trading_stats 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 5. Add trigger for automatic timestamp updates
CREATE TRIGGER update_whitelist_settings_updated_at
  BEFORE UPDATE ON public.whitelist_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trading_stats_updated_at
  BEFORE UPDATE ON public.trading_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Function to get symbols for scanning based on whitelist
CREATE OR REPLACE FUNCTION public.get_symbols_for_scanning()
RETURNS TEXT[] AS $$
DECLARE
  settings_row public.whitelist_settings%ROWTYPE;
BEGIN
  -- Get the latest whitelist settings
  SELECT * INTO settings_row 
  FROM public.whitelist_settings 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- If whitelist is enabled and has symbols, return them
  IF settings_row.whitelist_enabled AND array_length(settings_row.whitelist_pairs, 1) > 0 THEN
    RETURN settings_row.whitelist_pairs;
  END IF;
  
  -- Otherwise return all major USDT pairs
  RETURN ARRAY[
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
    'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT'
  ];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Function to increment credit usage
CREATE OR REPLACE FUNCTION public.increment_credit_usage(p_user_id UUID, p_credits INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_config public.automated_trading_config%ROWTYPE;
BEGIN
  -- Get current config
  SELECT * INTO current_config 
  FROM public.automated_trading_config 
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF (COALESCE(current_config.credits_used, 0) + p_credits) > COALESCE(current_config.credit_allowance, 250) THEN
    RETURN false; -- Insufficient credits
  END IF;
  
  -- Update credit usage
  UPDATE public.automated_trading_config 
  SET 
    credits_used = COALESCE(credits_used, 0) + p_credits,
    last_trade_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Update daily stats
  INSERT INTO public.trading_stats (user_id, date, trades_executed, credits_used)
  VALUES (p_user_id, CURRENT_DATE, 1, p_credits)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    trades_executed = public.trading_stats.trades_executed + 1,
    credits_used = public.trading_stats.credits_used + p_credits,
    updated_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;