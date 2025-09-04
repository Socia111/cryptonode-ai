-- Fix the pipeline_logs table policy name conflict
-- Drop the existing policy first
DROP POLICY IF EXISTS "Allow all operations on pipeline_logs" ON public.pipeline_logs;

-- Create comprehensive trading pipeline logging table  
CREATE TABLE IF NOT EXISTS public.pipeline_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signals_generated INTEGER DEFAULT 0,
  high_confidence_signals INTEGER DEFAULT 0,
  trades_executed INTEGER DEFAULT 0,
  trade_errors INTEGER DEFAULT 0,
  timeframes_scanned TEXT[] DEFAULT '{}',
  min_confidence_threshold INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system operations on pipeline_logs
CREATE POLICY "System can manage pipeline logs" ON public.pipeline_logs FOR ALL USING (true);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_run_at ON public.pipeline_logs(pipeline_run_at DESC);

-- Set up the comprehensive trading pipeline cron job
-- First drop any existing job
SELECT cron.unschedule('comprehensive-trading-pipeline');

-- Create the cron job to run every 60 seconds
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