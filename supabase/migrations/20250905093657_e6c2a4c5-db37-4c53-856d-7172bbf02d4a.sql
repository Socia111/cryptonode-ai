-- Enable required extensions for scheduled edge functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

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

-- Function to update trading session stats (fixed syntax)
CREATE OR REPLACE FUNCTION public.update_trading_session_stats(
    p_signals_processed INTEGER DEFAULT 0,
    p_trades_executed INTEGER DEFAULT 0,
    p_users_processed INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_session_id UUID;
BEGIN
    -- Get the most recent active session
    SELECT id INTO active_session_id
    FROM public.automated_trading_sessions 
    WHERE session_status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update the session if found
    IF active_session_id IS NOT NULL THEN
        UPDATE public.automated_trading_sessions 
        SET 
            total_signals_processed = total_signals_processed + p_signals_processed,
            total_trades_executed = total_trades_executed + p_trades_executed,
            total_users_processed = total_users_processed + p_users_processed,
            updated_at = NOW()
        WHERE id = active_session_id;
    END IF;
END;
$$;