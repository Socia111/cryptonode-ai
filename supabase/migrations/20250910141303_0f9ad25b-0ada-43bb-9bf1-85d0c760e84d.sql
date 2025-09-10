-- Check if policies exist and create only missing ones
DO $$
BEGIN
    -- Check and create policies for trading_config
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'trading_config' 
        AND policyname = 'Anyone can view trading config'
    ) THEN
        CREATE POLICY "Anyone can view trading config" ON public.trading_config
          FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'trading_config' 
        AND policyname = 'Service role can modify trading config'
    ) THEN
        CREATE POLICY "Service role can modify trading config" ON public.trading_config
          FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY;

-- Create default config if none exists
INSERT INTO public.trading_config (
  auto_trading_enabled, paper_mode, risk_per_trade_pct, 
  max_open_risk_pct, daily_loss_limit_pct, max_positions, 
  maker_only, default_leverage, min_confidence_score, min_risk_reward_ratio
) 
SELECT FALSE, TRUE, 0.75, 2.0, -5.0, 3, TRUE, 1, 70, 1.5
WHERE NOT EXISTS (SELECT 1 FROM public.trading_config LIMIT 1);