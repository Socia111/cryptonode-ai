-- Create trading_configs table for auto-trading settings
CREATE TABLE IF NOT EXISTS public.trading_configs (
  id TEXT PRIMARY KEY DEFAULT 'default',
  auto_trade_enabled BOOLEAN DEFAULT false,
  default_quantity NUMERIC DEFAULT 0.01,
  default_leverage INTEGER DEFAULT 1,
  max_daily_trades INTEGER DEFAULT 10,
  risk_percentage NUMERIC DEFAULT 1.0,
  min_confidence_score NUMERIC DEFAULT 80.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for trading configs
CREATE POLICY "Authenticated users can view trading configs"
  ON public.trading_configs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage trading configs"
  ON public.trading_configs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_trading_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trading_configs_updated_at
  BEFORE UPDATE ON public.trading_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trading_configs_updated_at();

-- Insert default config
INSERT INTO public.trading_configs (id, auto_trade_enabled, default_quantity, default_leverage)
VALUES ('default', false, 0.01, 1)
ON CONFLICT (id) DO NOTHING;