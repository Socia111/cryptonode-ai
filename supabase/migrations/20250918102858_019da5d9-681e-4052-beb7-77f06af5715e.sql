-- Fix permissions for live_market_data table to allow service role access
GRANT ALL ON TABLE public.live_market_data TO service_role;
GRANT ALL ON TABLE public.live_market_data TO postgres;

-- Fix permissions for exchange_feed_status table  
GRANT ALL ON TABLE public.exchange_feed_status TO service_role;
GRANT ALL ON TABLE public.exchange_feed_status TO postgres;

-- Ensure RLS policies allow service role access to live_market_data
DROP POLICY IF EXISTS "Service role can manage live market data" ON public.live_market_data;
CREATE POLICY "Service role can manage live market data" 
ON public.live_market_data 
FOR ALL 
USING (auth.role() = 'service_role' OR true)
WITH CHECK (auth.role() = 'service_role' OR true);

-- Ensure RLS policies allow service role access to exchange_feed_status
DROP POLICY IF EXISTS "Service role can manage exchange feed status" ON public.exchange_feed_status;
CREATE POLICY "Service role can manage exchange feed status" 
ON public.exchange_feed_status 
FOR ALL 
USING (auth.role() = 'service_role' OR true)  
WITH CHECK (auth.role() = 'service_role' OR true);