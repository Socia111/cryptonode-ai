-- Check if there are any remaining jobs generating 15m signals
-- Job 9 calls live-scanner-production with 1h timeframe, which seems to be generating 15m internally
-- Let's check what live-scanner-production is doing by calling unified-signal-engine instead

-- Update the 1h job to call unified-signal-engine directly
SELECT cron.unschedule('aitradex1-1h-canonical');

-- Create a new job that calls unified-signal-engine for 1h only
SELECT cron.schedule(
  'unified-1h-signals',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/unified-signal-engine',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
    body := '{"timeframes": ["1h"], "automated": true}'::jsonb
  ) AS request_id;
  $$
);

-- Clean up the latest 15m signals that just came in
DELETE FROM signals WHERE timeframe = '15m' AND created_at > NOW() - INTERVAL '1 hour';