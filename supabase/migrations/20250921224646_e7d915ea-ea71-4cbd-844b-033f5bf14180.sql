-- Trigger the comprehensive live system to generate real signals with live data
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/comprehensive-live-system',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{}'::jsonb
  ) as comprehensive_system_test;

-- Check results immediately after
SELECT 'LIVE_DATA_CHECK' as test_stage,
  COUNT(*) as total_live_prices,
  COUNT(CASE WHEN last_updated > now() - interval '5 minutes' THEN 1 END) as recent_prices
FROM live_prices;

SELECT 'SIGNALS_CHECK' as test_stage,
  COUNT(*) as total_signals,
  COUNT(CASE WHEN created_at > now() - interval '5 minutes' THEN 1 END) as recent_signals,
  COUNT(CASE WHEN source = 'comprehensive_live_system' THEN 1 END) as live_system_signals
FROM signals;