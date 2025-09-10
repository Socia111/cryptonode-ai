-- Step 1: Create default user trading config if none exists
INSERT INTO public.user_trading_configs (
  user_id,
  auto_execute_enabled,
  max_position_size,
  risk_per_trade,
  max_open_positions,
  min_confidence_score,
  timeframes,
  symbols_blacklist,
  use_leverage,
  leverage_amount,
  paper_mode,
  daily_loss_limit
) 
SELECT 
  auth.uid(),
  false,
  100.0,
  2.0,
  3,
  80,
  ARRAY['15m', '30m'],
  ARRAY['USDCUSDT'],
  false,
  1,
  true,
  100.0
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_trading_configs WHERE user_id = auth.uid()
);