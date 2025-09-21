-- Test all critical trading functions step by step
-- 1. Test aitradex1-trade-executor
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/aitradex1-trade-executor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{"action": "status"}'::jsonb
  ) as trade_executor_test;

-- 2. Test bybit-live-trading
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-live-trading',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{"action": "status"}'::jsonb
  ) as bybit_live_trading_test;

-- 3. Test comprehensive live system
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/comprehensive-live-system',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{}'::jsonb
  ) as comprehensive_system_test;