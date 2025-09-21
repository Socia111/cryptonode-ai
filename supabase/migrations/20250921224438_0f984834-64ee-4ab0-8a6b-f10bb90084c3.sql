-- Step 1: Test live crypto feed function
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-crypto-feed',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{"symbols": ["BTCUSDT", "ETHUSDT", "BNBUSDT"], "force_update": true}'::jsonb
  ) as live_feed_request;

-- Step 2: Test unified signal engine with real data
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/unified-signal-engine',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{"test_mode": false, "live_data": true}'::jsonb
  ) as signal_engine_request;

-- Step 3: Test comprehensive scanner with real data
SELECT 
  net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/aitradex1-comprehensive-engine',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{"timeframe": "1h", "live_mode": true, "symbols": ["BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "SOLUSDT"]}'::jsonb
  ) as comprehensive_request;

-- Step 4: Log the test initiation
INSERT INTO edge_event_log (fn, stage, payload)
VALUES ('comprehensive_live_test', 'initiated', 
  json_build_object(
    'timestamp', now(),
    'test_type', 'full_system_real_data',
    'target_functions', array['live-crypto-feed', 'unified-signal-engine', 'aitradex1-comprehensive-engine']
  )
);