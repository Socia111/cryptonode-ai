-- Fix RLS policies for key tables
-- exchange_feed_status: Allow public access for status monitoring
DROP POLICY IF EXISTS "exchange_feed_status_read_policy" ON exchange_feed_status;
DROP POLICY IF EXISTS "exchange_feed_status_manage_policy" ON exchange_feed_status;

CREATE POLICY "Public read access to exchange feed status" 
ON exchange_feed_status FOR SELECT USING (true);

CREATE POLICY "Service role can manage exchange feed status" 
ON exchange_feed_status FOR ALL USING (auth.role() = 'service_role'::text);

-- live_market_data: Ensure public access for live data
DROP POLICY IF EXISTS "Live market data is publicly readable" ON live_market_data;
DROP POLICY IF EXISTS "Service role can manage live market data" ON live_market_data;

CREATE POLICY "Public read access to live market data" 
ON live_market_data FOR SELECT USING (true);

CREATE POLICY "Service role can manage live market data" 
ON live_market_data FOR ALL USING (auth.role() = 'service_role'::text);

-- execution_orders: Fix permissions
DROP POLICY IF EXISTS "execution_orders_read_policy" ON execution_orders;

CREATE POLICY "Public read access to paper mode orders" 
ON execution_orders FOR SELECT 
USING (paper_mode = true OR auth.uid() = user_id OR auth.role() = 'service_role'::text);

-- user_trading_accounts: Ensure proper access
DROP POLICY IF EXISTS "Service role and edge functions can access trading accounts" ON user_trading_accounts;

CREATE POLICY "Service role and users can access trading accounts" 
ON user_trading_accounts FOR ALL 
USING (auth.role() = 'service_role'::text OR auth.uid() = user_id)
WITH CHECK (auth.role() = 'service_role'::text OR auth.uid() = user_id);