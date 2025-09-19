-- ✅ Phase 4: Set up automated scheduler using pg_cron
-- This will run the automated orchestrator every 2 minutes

SELECT cron.schedule(
  'automated-trading-orchestrator',
  '*/2 * * * *', -- every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/fully-automated-orchestrator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.wF8ZYLz-GvW1Sn-7vRBxb3Z8VQZ5KY_7vQyK1K1K1K1K1K1K1K1K1K1K1K1K1K1K1"}'::jsonb,
        body:=concat('{"mode": "scheduled", "timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Also set up signal generator every 2 minutes
SELECT cron.schedule(
  'signal-auto-generator',
  '*/2 * * * *', -- every 2 minutes  
  $$
  SELECT
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/signal-auto-generator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.wF8ZYLz-GvW1Sn-7vRBxb3Z8VQZ5KY_7vQyK1K1K1K1K1K1K1K1K1K1K1K1K1K1K1"}'::jsonb,
        body:=concat('{"mode": "scheduled", "timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Update system status to show automation is active
UPDATE system_status 
SET 
  status = 'active',
  metadata = metadata || '{"scheduler_enabled": true, "frequency": "every_2_minutes", "last_scheduled": "' || now() || '"}'::jsonb,
  last_update = now()
WHERE service_name IN ('fully_automated_orchestrator', 'signal_auto_generator');