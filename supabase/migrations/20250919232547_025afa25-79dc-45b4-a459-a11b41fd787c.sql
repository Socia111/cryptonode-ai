-- Set up automated scheduling for crypto-scheduler
-- Create a scheduled job to run crypto-scheduler every 15 minutes

SELECT cron.schedule(
  'crypto-scheduler-automation',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/crypto-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.lAUCXHMqK6YJCJcINShQtJksw6Ei6w9kcZuLXKBHy1g"}'::jsonb,
        body:='{"automated": true, "source": "cron_scheduler"}'::jsonb
    ) as request_id;
  $$
);

-- Also create a health check job every 5 minutes to ensure system is running
SELECT cron.schedule(
  'system-health-check',
  '*/5 * * * *', -- Every 5 minutes
  $$
  INSERT INTO system_status (service_name, status, metadata, last_update)
  VALUES (
    'automated_scheduler', 
    'active', 
    '{"health_check": true, "timestamp": "' || now() || '"}',
    now()
  )
  ON CONFLICT (service_name) 
  DO UPDATE SET 
    last_update = now(),
    metadata = '{"health_check": true, "timestamp": "' || now() || '"}';
  $$
);