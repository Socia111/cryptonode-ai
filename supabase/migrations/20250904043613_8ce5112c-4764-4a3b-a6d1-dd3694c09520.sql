-- Create user trading configurations table
CREATE TABLE IF NOT EXISTS public.user_trading_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    auto_execute_enabled BOOLEAN DEFAULT false,
    max_position_size NUMERIC DEFAULT 10,
    risk_per_trade NUMERIC DEFAULT 2,
    max_open_positions INTEGER DEFAULT 5,
    min_confidence_score INTEGER DEFAULT 77,
    timeframes TEXT[] DEFAULT ARRAY['5m', '15m'],
    symbols_blacklist TEXT[] DEFAULT ARRAY['USDCUSDT'],
    use_leverage BOOLEAN DEFAULT false,
    leverage_amount INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user trading configs
ALTER TABLE public.user_trading_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user trading configs
CREATE POLICY "Users can view their own trading config" 
ON public.user_trading_configs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading config" 
ON public.user_trading_configs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading config" 
ON public.user_trading_configs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading config" 
ON public.user_trading_configs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_trading_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trading_configs_updated_at
BEFORE UPDATE ON public.user_trading_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_trading_configs_updated_at();

-- Create trigger function for signal automation
CREATE OR REPLACE FUNCTION public.trigger_signal_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger automation for high-confidence signals
  IF NEW.score >= 77 THEN
    PERFORM net.http_post(
      url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/signal-automation-trigger',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on signals table to automatically execute trades
CREATE TRIGGER signal_automation_trigger
  AFTER INSERT ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_signal_automation();