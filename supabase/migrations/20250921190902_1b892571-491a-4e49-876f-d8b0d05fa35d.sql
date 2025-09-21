-- Remove all 15m signals and ensure only 1h signals remain
DELETE FROM signals WHERE timeframe = '15m' OR timeframe = '5m';

-- Unschedule any remaining cron jobs that might generate 15m signals
SELECT cron.unschedule('unified-1h-signals');
SELECT cron.unschedule('aitradex1-1h-canonical');
SELECT cron.unschedule('live-crypto-feed-automation');
SELECT cron.unschedule('realtime-signals-automation');

-- Create single 1h signal generation job using unified-signal-engine
SELECT cron.schedule(
  'unified-1h-signals-only',
  '0 * * * *', -- Every hour at minute 0
  $$
  select
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/unified-signal-engine',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.6_vFCMd5LTxhxHKF7VqNIz3X1Giv9Bc_wPJ0C5Tr1NA"}'::jsonb,
        body:='{"timeframe": "1h", "force_1h_only": true}'::jsonb
    ) as request_id;
  $$
);