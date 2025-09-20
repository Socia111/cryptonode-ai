-- Fix database schema issues for signals table

-- First, add the missing hvp column to signals table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'signals' AND column_name = 'hvp') THEN
        ALTER TABLE signals ADD COLUMN hvp numeric;
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_signals_hvp ON signals(hvp) WHERE hvp IS NOT NULL;
    END IF;
END $$;

-- Add replica identity for real-time subscriptions
ALTER TABLE signals REPLICA IDENTITY FULL;

-- Add signals table to realtime publication for live updates
SELECT FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'signals';
DO $$
BEGIN
    IF NOT FOUND THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE signals;
    END IF;
END $$;

-- Also ensure other key tables are set up for realtime
ALTER TABLE execution_orders REPLICA IDENTITY FULL;
ALTER TABLE system_status REPLICA IDENTITY FULL;
ALTER TABLE live_market_data REPLICA IDENTITY FULL;

-- Add these tables to realtime publication if not already added
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE execution_orders;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE system_status;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE live_market_data;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
END $$;

-- Create a simple test function for edge function testing
CREATE OR REPLACE FUNCTION public.test_edge_function()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Edge function test successful',
        'timestamp', now(),
        'database_connection', 'active'
    );
END;
$$;