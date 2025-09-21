-- Final cleanup and ensure only 1h signals
DELETE FROM signals WHERE timeframe IN ('15m', '5m', '30m');

-- Schedule only unified 1h signal generation
SELECT cron.schedule(
  'final-1h-signals',
  '0 * * * *', -- Every hour
  $$
  select
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/unified-signal-engine',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.6_vFCMd5LTxhxHKF7VqNIz3X1Giv9Bc_wPJ0C5Tr1NA"}'::jsonb,
        body:='{"timeframes": ["1h"]}'::jsonb
    ) as request_id;
  $$
);