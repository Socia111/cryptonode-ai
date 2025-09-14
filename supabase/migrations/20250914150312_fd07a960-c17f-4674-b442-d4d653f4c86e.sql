-- Fix RLS policies to allow proper authenticated access for signals table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.signals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.signals;

-- Create proper authenticated-only policies for signals
CREATE POLICY "Authenticated users can read signals" ON public.signals
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role can manage signals" ON public.signals
FOR ALL TO service_role
USING (true);

-- Ensure tables for realtime have proper configuration
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Add signals table to realtime publication if not already added
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL; -- Table already in publication
    END;
END $$;

-- Create an index to improve signal queries performance
CREATE INDEX IF NOT EXISTS idx_signals_score_created_at ON public.signals (score DESC, created_at DESC) WHERE score >= 80;
CREATE INDEX IF NOT EXISTS idx_signals_symbol_timeframe ON public.signals (symbol, timeframe, created_at DESC);

-- Fix edge_event_log policies for better access control
DROP POLICY IF EXISTS "Allow anonymous read access to edge logs" ON public.edge_event_log;
CREATE POLICY "Service role and authenticated can read edge logs" ON public.edge_event_log
FOR SELECT TO authenticated, service_role
USING (true);

-- Fix trade_logs policies
DROP POLICY IF EXISTS "Allow anonymous read access to trade logs" ON public.trade_logs;
CREATE POLICY "Authenticated users can read trade logs" ON public.trade_logs
FOR SELECT TO authenticated
USING (true);