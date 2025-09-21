-- Disable all cron jobs that call old signal generators
SELECT cron.unschedule('live-scanner-15m');
SELECT cron.unschedule('live-scanner-continuous');
SELECT cron.unschedule('aitradex1-1m-discovery');

-- Create a new cron job for the unified 1h engine only
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