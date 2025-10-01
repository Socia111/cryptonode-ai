-- Enable pg_cron and pg_net extensions for automated scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing cron jobs if they exist
SELECT cron.unschedule('live-scanner-15m') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'live-scanner-15m');
SELECT cron.unschedule('auto-trading-poller-1m') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-trading-poller-1m');

-- Schedule live scanner to run every 15 minutes
SELECT cron.schedule(
  'live-scanner-15m',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-scanner-production',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.Y5o5gD5-5D5D5D5D5D5D5D5D5D5D5D5D5D5D5D5"}'::jsonb,
    body := '{"timeframe": "15m"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule auto-trading poller to run every minute
SELECT cron.schedule(
  'auto-trading-poller-1m',
  '* * * * *', -- every minute
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/auto-trading-poller',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.Y5o5gD5-5D5D5D5D5D5D5D5D5D5D5D5D5D5D5D5"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Insert automation state
INSERT INTO app_settings (key, value, description)
VALUES 
  ('automation_state', '{"connected": true, "autoEnabled": true, "mode": "live", "activeTrades": 0, "pnlToday": 0, "riskLevel": "balanced", "maxPositionUSD": 100}'::jsonb, 'Automation system state'),
  ('scanner_enabled', 'true'::jsonb, 'Live scanner enabled status')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();