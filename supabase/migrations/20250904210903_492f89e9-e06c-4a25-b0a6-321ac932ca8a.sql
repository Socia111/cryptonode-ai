-- Fix the trading_configs table with proper UUID and add missing column
DROP TABLE IF EXISTS public.trading_configs;

CREATE TABLE public.trading_configs (
    id UUID PRIMARY KEY DEFAULT 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    auto_trade_enabled BOOLEAN DEFAULT false,
    max_position_size DECIMAL DEFAULT 100,
    risk_per_trade DECIMAL DEFAULT 2,
    min_confidence_score INTEGER DEFAULT 80,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_configs ENABLE ROW LEVEL SECURITY;

-- Create policy that allows read/write access
CREATE POLICY "Public access to trading configs" ON public.trading_configs FOR ALL USING (true) WITH CHECK (true);

-- Insert default configuration
INSERT INTO public.trading_configs (id, auto_trade_enabled, max_position_size, risk_per_trade, min_confidence_score) 
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', false, 100, 2, 80)
ON CONFLICT (id) DO UPDATE SET
    updated_at = now();

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_trading_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trading_configs_updated_at
    BEFORE UPDATE ON public.trading_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_trading_configs_updated_at();