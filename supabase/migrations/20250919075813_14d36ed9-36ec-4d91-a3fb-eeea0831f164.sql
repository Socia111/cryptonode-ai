-- Comprehensive fix for all permission issues

-- Fix execution_orders table policies
DROP POLICY IF EXISTS "execution_orders_paper_trades_anon_access" ON public.execution_orders;

-- Allow authenticated users and service role full access to execution orders
CREATE POLICY "execution_orders_authenticated_access" 
ON public.execution_orders 
FOR ALL 
USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role')
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Allow anonymous access for paper trades only
CREATE POLICY "execution_orders_anonymous_paper_trades" 
ON public.execution_orders 
FOR ALL 
USING (paper_mode = true)
WITH CHECK (paper_mode = true);

-- Fix exchange_feed_status table policies
DROP POLICY IF EXISTS "exchange_feed_status_public_access" ON public.exchange_feed_status;
DROP POLICY IF EXISTS "exchange_feed_status_service_access" ON public.exchange_feed_status;

-- Allow everyone to read exchange feed status
CREATE POLICY "exchange_feed_status_read_all" 
ON public.exchange_feed_status 
FOR SELECT 
USING (true);

-- Allow authenticated users and service role to write
CREATE POLICY "exchange_feed_status_write_auth" 
ON public.exchange_feed_status 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

CREATE POLICY "exchange_feed_status_update_auth" 
ON public.exchange_feed_status 
FOR UPDATE 
USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Fix user_trading_accounts policies to allow authenticated users to access their own data
DROP POLICY IF EXISTS "user_trading_accounts_owner_access" ON public.user_trading_accounts;

CREATE POLICY "user_trading_accounts_owner_full_access" 
ON public.user_trading_accounts 
FOR ALL 
USING (auth.uid() = user_id OR auth.role() = 'service_role')
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');