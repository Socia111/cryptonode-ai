-- Fix RLS policies for execution_orders table to allow anonymous INSERT for paper trades
DROP POLICY IF EXISTS "execution_orders_paper_access" ON public.execution_orders;
DROP POLICY IF EXISTS "execution_orders_paper_read" ON public.execution_orders;

-- Allow anonymous users to read and insert paper trades
CREATE POLICY "execution_orders_paper_trades_anon_access" 
ON public.execution_orders 
FOR ALL 
USING (paper_mode = true OR auth.uid() IS NOT NULL OR auth.role() = 'service_role')
WITH CHECK (paper_mode = true OR auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Fix RLS policies for exchange_feed_status table  
DROP POLICY IF EXISTS "exchange_feed_status_public_read" ON public.exchange_feed_status;
DROP POLICY IF EXISTS "exchange_feed_status_service_write" ON public.exchange_feed_status;

-- Allow public read access and service role write access
CREATE POLICY "exchange_feed_status_public_access" 
ON public.exchange_feed_status 
FOR SELECT 
USING (true);

CREATE POLICY "exchange_feed_status_service_access" 
ON public.exchange_feed_status 
FOR ALL 
USING (auth.role() = 'service_role' OR true)
WITH CHECK (auth.role() = 'service_role' OR true);