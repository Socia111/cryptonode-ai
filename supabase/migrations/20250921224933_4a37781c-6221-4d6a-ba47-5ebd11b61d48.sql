-- Test the bybit-broker function directly
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-broker/ping',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{}'::jsonb
  ) as bybit_ping_test;

-- Test the OPTIONS request directly
SELECT 
  net.http_request(
    method := 'OPTIONS',
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-broker',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) as bybit_options_test;