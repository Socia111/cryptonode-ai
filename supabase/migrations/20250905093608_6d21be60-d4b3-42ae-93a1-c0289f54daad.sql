-- Enable required extensions for scheduled edge functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run auto-trading every 2 minutes
SELECT cron.schedule(
  'automated-crypto-trading',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/crypto-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.U4UyJNq5CmB9g-PTZKzaJ0vR6yREK1YFEj_Q8QvkXgE"}'::jsonb,
        body:='{"triggered_by": "cron_scheduler", "interval": "2_minutes"}'::jsonb
    ) as request_id;
  $$
);

-- Create a table to track automated trading sessions
CREATE TABLE IF NOT EXISTS public.automated_trading_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    total_signals_processed INTEGER DEFAULT 0,
    total_trades_executed INTEGER DEFAULT 0,
    total_users_processed INTEGER DEFAULT 0,
    session_status TEXT DEFAULT 'active' CHECK (session_status IN ('active', 'paused', 'stopped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE public.automated_trading_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for the automated trading sessions table
CREATE POLICY "Users can view automated trading sessions" 
ON public.automated_trading_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage automated trading sessions" 
ON public.automated_trading_sessions 
FOR ALL 
USING (auth.role() = 'service_role');

-- Function to start a new trading session
CREATE OR REPLACE FUNCTION public.start_automated_trading_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
BEGIN
    -- End any active sessions first
    UPDATE public.automated_trading_sessions 
    SET session_status = 'stopped', 
        session_end = NOW(),
        updated_at = NOW()
    WHERE session_status = 'active';
    
    -- Start new session
    INSERT INTO public.automated_trading_sessions (session_status)
    VALUES ('active')
    RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$;

-- Function to update trading session stats
CREATE OR REPLACE FUNCTION public.update_trading_session_stats(
    p_signals_processed INTEGER DEFAULT 0,
    p_trades_executed INTEGER DEFAULT 0,
    p_users_processed INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.automated_trading_sessions 
    SET 
        total_signals_processed = total_signals_processed + p_signals_processed,
        total_trades_executed = total_trades_executed + p_trades_executed,
        total_users_processed = total_users_processed + p_users_processed,
        updated_at = NOW()
    WHERE session_status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
END;
$$;