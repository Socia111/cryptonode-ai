-- Enable pg_cron and pg_net extensions for automated scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fix RLS policies for execution_orders to allow anonymous access for service functions
ALTER TABLE public.execution_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.execution_orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.execution_orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.execution_orders;
DROP POLICY IF EXISTS "Service role can manage all orders" ON public.execution_orders;

-- Create new comprehensive policies
CREATE POLICY "Allow authenticated users to manage their own orders"
ON public.execution_orders
FOR ALL
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (auth.role() = 'service_role')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (auth.role() = 'service_role')
);

-- Allow anonymous users to view paper trading orders for demo purposes
CREATE POLICY "Allow anonymous read access to paper trading orders"
ON public.execution_orders
FOR SELECT
USING (paper_mode = true);

-- Schedule live data collection every 30 seconds
SELECT cron.schedule(
  'live-data-collection',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-data-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0"}'::jsonb,
        body:='{"trigger": "cron", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Add schedule for signal generation every 2 minutes
SELECT cron.schedule(
  'signal-generation',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/aitradex1-enhanced-scanner',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0"}'::jsonb,
        body:='{"exchange": "bybit", "timeframes": ["5m", "15m", "1h"], "scan_all_coins": true}'::jsonb
    ) as request_id;
  $$
);

-- Enable real-time updates for critical tables
ALTER TABLE public.signals REPLICA IDENTITY FULL;
ALTER TABLE public.execution_orders REPLICA IDENTITY FULL;
ALTER TABLE public.live_market_data REPLICA IDENTITY FULL;