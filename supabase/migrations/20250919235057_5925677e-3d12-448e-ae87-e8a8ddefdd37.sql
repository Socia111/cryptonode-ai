-- Enable the pg_cron extension for automated scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to trigger crypto scheduler
CREATE OR REPLACE FUNCTION trigger_crypto_scheduler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    scheduler_url text;
    response text;
BEGIN
    -- Get Supabase URL from settings or use default
    scheduler_url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/crypto-scheduler';
    
    -- Make HTTP request to trigger scheduler
    SELECT content INTO response FROM http_post(
        scheduler_url,
        '{"automated": true}',
        'application/json'
    );
    
    -- Log the scheduler trigger
    INSERT INTO edge_event_log (fn, stage, payload)
    VALUES ('crypto_scheduler', 'cron_triggered', jsonb_build_object(
        'timestamp', now(),
        'response', response
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

-- Schedule the crypto scheduler to run every 15 minutes
SELECT cron.schedule(
    'crypto-scheduler-15min',  -- Job name
    '*/15 * * * *',           -- Every 15 minutes
    'SELECT trigger_crypto_scheduler();'
);

-- Create app settings for automated trading (if not exists)
INSERT INTO app_settings (key, value, updated_at) 
VALUES 
    ('automated_trading_enabled', 'true', now()),
    ('live_trading_enabled', 'true', now()),
    ('scheduler_interval_minutes', '15', now())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

-- Create system status entry for scheduler
INSERT INTO system_status (service_name, status, last_update, metadata)
VALUES ('crypto_scheduler', 'initializing', now(), '{"cron_enabled": true, "interval_minutes": 15}')
ON CONFLICT (service_name) DO UPDATE SET
    status = 'initializing',
    last_update = now(),
    metadata = '{"cron_enabled": true, "interval_minutes": 15}';