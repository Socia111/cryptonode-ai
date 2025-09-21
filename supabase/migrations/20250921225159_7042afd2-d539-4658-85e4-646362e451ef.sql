-- Test a real trade execution with one of our live signals
-- First, test the bybit-broker with a simple status check
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-broker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{"action": "status"}'::jsonb
  ) as bybit_broker_status_test;

-- Test a mock trade execution (paper trading)
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-broker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{"symbol": "ETHUSDT", "side": "Buy", "qty": "0.001", "orderType": "Market", "category": "linear"}'::jsonb
  ) as mock_trade_execution_test;

-- Log the test results
INSERT INTO edge_event_log (fn, stage, payload)
VALUES ('system_test', 'trade_execution_test', 
  json_build_object(
    'timestamp', now(),
    'test_type', 'mock_trade_execution',
    'symbol', 'ETHUSDT',
    'side', 'Buy',
    'qty', '0.001'
  )
);