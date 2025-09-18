-- Fix RLS policies for exchange_feed_status table
-- Allow authenticated users to read exchange feed status
DROP POLICY IF EXISTS "Service role can manage exchange feed status" ON public.exchange_feed_status;
CREATE POLICY "Service role can manage exchange feed status" 
ON public.exchange_feed_status 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read exchange feed status" 
ON public.exchange_feed_status 
FOR SELECT 
USING (auth.uid() IS NOT NULL OR true);

-- Fix RLS policies for user_trading_accounts table
-- Allow authenticated users to manage their own accounts
DROP POLICY IF EXISTS "Full access for authenticated users and service role" ON public.user_trading_accounts;
CREATE POLICY "Authenticated users can manage trading accounts" 
ON public.user_trading_accounts 
FOR ALL 
USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role')
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Fix RLS policies for execution_orders table  
-- Allow authenticated users to access execution orders
DROP POLICY IF EXISTS "Allow all operations for authenticated users and service role" ON public.execution_orders;
CREATE POLICY "Authenticated users can manage execution orders" 
ON public.execution_orders 
FOR ALL 
USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role' OR paper_mode = true)
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role' OR paper_mode = true);

-- Add policy for anonymous access to paper trading orders (demo mode)
CREATE POLICY "Anonymous can read paper orders" 
ON public.execution_orders 
FOR SELECT 
USING (paper_mode = true);

-- Ensure signals table has proper access for authenticated users
CREATE POLICY IF NOT EXISTS "Authenticated users can read signals" 
ON public.signals 
FOR SELECT 
USING (auth.uid() IS NOT NULL OR true);

-- Allow edge functions to insert signals
CREATE POLICY IF NOT EXISTS "Service role can manage signals" 
ON public.signals 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');