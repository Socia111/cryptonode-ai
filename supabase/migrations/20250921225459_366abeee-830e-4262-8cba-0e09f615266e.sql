-- Final comprehensive test to verify all systems working
-- Check if signals were generated from comprehensive system
SELECT 'FINAL_CHECK' as test_stage,
  COUNT(*) as total_signals,
  COUNT(CASE WHEN created_at > now() - interval '15 minutes' THEN 1 END) as recent_signals,
  COUNT(CASE WHEN source = 'comprehensive_live_system' THEN 1 END) as live_system_signals,
  MAX(created_at) as latest_signal_time
FROM signals;

-- Check if live prices are updating
SELECT 'LIVE_PRICES_CHECK' as test_stage,
  COUNT(*) as total_prices,
  COUNT(CASE WHEN last_updated > now() - interval '15 minutes' THEN 1 END) as recent_updates,
  MAX(last_updated) as latest_update
FROM live_prices;

-- Test a simple trade execution simulation
INSERT INTO execution_orders (
  symbol, side, qty, amount_usd, status, user_id, 
  executed_price, commission, real_trade, credentials_source
) VALUES (
  'ETHUSDT', 'Buy', 0.001, 4.50, 'simulated', 'ea52a338-c40d-4809-9014-10151b3af9af',
  4497.61, 0.01, false, 'test'
) RETURNING id, symbol, status;