-- Final comprehensive system validation
-- Check if all components are working
SELECT 'LIVE_PRICES_STATUS' as component,
  COUNT(*) as total_records,
  COUNT(CASE WHEN last_updated > now() - interval '30 minutes' THEN 1 END) as recent_updates,
  MAX(last_updated) as latest_update
FROM live_prices;

SELECT 'SIGNALS_STATUS' as component,
  COUNT(*) as total_records, 
  COUNT(CASE WHEN created_at > now() - interval '30 minutes' THEN 1 END) as recent_signals,
  COUNT(CASE WHEN source = 'comprehensive_live_system' THEN 1 END) as live_system_signals,
  MAX(created_at) as latest_signal
FROM signals;

SELECT 'SYSTEM_HEALTH' as component,
  CASE WHEN COUNT(*) > 0 THEN 'OPERATIONAL' ELSE 'NEEDS_SETUP' END as status,
  COUNT(*) as signal_count,
  COUNT(CASE WHEN timeframe = '1h' THEN 1 END) as hour_signals
FROM signals 
WHERE created_at > now() - interval '2 hours';