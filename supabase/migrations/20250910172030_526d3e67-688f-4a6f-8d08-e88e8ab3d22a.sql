-- Enable live trading by updating the trading configuration
UPDATE trading_config 
SET 
  auto_trading_enabled = true,
  paper_mode = false,
  updated_at = now()
WHERE id = 'fc48936e-93c3-4cfc-85bd-23d0c74b767b';

-- Verify the configuration is updated
SELECT 
  auto_trading_enabled,
  paper_mode,
  risk_per_trade_pct,
  max_positions,
  updated_at
FROM trading_config 
LIMIT 1;