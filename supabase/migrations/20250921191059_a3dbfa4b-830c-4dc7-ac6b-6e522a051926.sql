-- Remove remaining 15m signals and cron jobs, ensure only 1h generation
DELETE FROM signals WHERE timeframe = '15m' OR timeframe = '5m';

-- Clean schedule to ensure only 1h signals
SELECT cron.unschedule('unified-1h-signals-only');

-- Create final 1h-only signal generation
SELECT cron.schedule(
  'unified-1h-only',
  '0 * * * *', -- Every hour
  $$
  select
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/unified-signal-engine',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.6_vFCMd5LTxhxHKF7VqNIz3X1Giv9Bc_wPJ0C5Tr1NA"}'::jsonb,
        body:='{"timeframes": ["1h"], "enforce_1h_only": true}'::jsonb
    ) as request_id;
  $$
);