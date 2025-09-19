-- Fix security issues from the scheduler setup

-- Update the trigger function to use proper search path
CREATE OR REPLACE FUNCTION trigger_crypto_scheduler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    scheduler_url text;
    response jsonb;
    request_id bigint;
BEGIN
    -- Get Supabase URL from settings or use default
    scheduler_url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/crypto-scheduler';
    
    -- Make HTTP request to trigger scheduler using net.http_post
    SELECT net.http_post(
        url := scheduler_url,
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
        body := '{"automated": true}'::jsonb
    ) INTO request_id;
    
    -- Log the scheduler trigger
    INSERT INTO edge_event_log (fn, stage, payload)
    VALUES ('crypto_scheduler', 'cron_triggered', jsonb_build_object(
        'timestamp', now(),
        'request_id', request_id
    ));
    
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO edge_event_log (fn, stage, payload)
    VALUES ('crypto_scheduler', 'cron_error', jsonb_build_object(
        'timestamp', now(),
        'error', SQLERRM
    ));
END;
$$;

-- Enable the necessary extensions in the extensions schema (not public)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Verify we can run the cron job with the updated function
SELECT cron.unschedule('crypto-scheduler-15min');
SELECT cron.schedule(
    'crypto-scheduler-15min',  -- Job name
    '*/15 * * * *',           -- Every 15 minutes
    'SELECT trigger_crypto_scheduler();'
);