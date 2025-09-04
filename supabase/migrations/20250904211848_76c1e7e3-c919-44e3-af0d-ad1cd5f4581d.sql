-- Fix the policy conflict for pipeline_logs
-- Drop all existing policies first
DROP POLICY IF EXISTS "System can manage pipeline logs" ON public.pipeline_logs;
DROP POLICY IF EXISTS "Allow all operations on pipeline_logs" ON public.pipeline_logs;

-- Create a single unified policy
CREATE POLICY "Comprehensive pipeline access" ON public.pipeline_logs FOR ALL USING (true);

-- Set up the comprehensive trading pipeline cron job (without the failed part)
-- First, try to unschedule if it exists
DO $$
BEGIN
    PERFORM cron.unschedule('comprehensive-trading-pipeline');
EXCEPTION
    WHEN OTHERS THEN
        -- Job doesn't exist, continue
        NULL;
END$$;

-- Create the scheduled job to run every 60 seconds
SELECT cron.schedule(
    'comprehensive-trading-pipeline',
    '* * * * *', -- Every minute
    $$
    SELECT
        net.http_post(
            url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/comprehensive-trading-pipeline',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0"}'::jsonb,
            body:='{"automated_pipeline": true}'::jsonb
        ) as request_id;
    $$
);