-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to run live scanner every 5 minutes
SELECT cron.schedule(
  'live-scanner-continuous', 
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-scanner-production',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'exchange', 'bybit',
      'timeframe', '1h',
      'relaxed_filters', true,
      'symbols', '[]'::jsonb
    )
  );
  $$
);

-- Create additional scanning jobs for different timeframes
SELECT cron.schedule(
  'live-scanner-15m', 
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-scanner-production',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'exchange', 'bybit',
      'timeframe', '15m',
      'relaxed_filters', true,
      'symbols', '[]'::jsonb
    )
  );
  $$
);

-- Create signal cleanup job to remove old signals
SELECT cron.schedule(
  'cleanup-old-signals',
  '0 2 * * *', -- Daily at 2 AM
  $$
  UPDATE signals 
  SET status = 'expired' 
  WHERE generated_at < NOW() - INTERVAL '7 days' 
  AND status = 'active';
  $$
);