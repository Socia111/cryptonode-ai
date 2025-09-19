-- Create proper RLS policies for critical tables

-- 1. Fix execution_orders
CREATE POLICY "Users view own execution orders" 
ON execution_orders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own execution orders" 
ON execution_orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages execution orders" 
ON execution_orders FOR ALL 
USING (auth.role() = 'service_role');

-- 2. Fix user_trading_accounts  
CREATE POLICY "Users view own trading accounts" 
ON user_trading_accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users manage own trading accounts" 
ON user_trading_accounts FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages trading accounts" 
ON user_trading_accounts FOR ALL 
USING (auth.role() = 'service_role');

-- 3. Fix live_market_data access
CREATE POLICY "Authenticated read live market data" 
ON live_market_data FOR SELECT 
USING (true);

CREATE POLICY "Service role manages live market data" 
ON live_market_data FOR ALL 
USING (auth.role() = 'service_role');

-- 4. Fix exchange_feed_status access  
CREATE POLICY "Authenticated read exchange feed status" 
ON exchange_feed_status FOR SELECT 
USING (true);

CREATE POLICY "Service role manages exchange feed status" 
ON exchange_feed_status FOR ALL 
USING (auth.role() = 'service_role');

-- 5. Fix signals table policies
CREATE POLICY "Authenticated read active signals" 
ON signals FOR SELECT 
USING (is_active = true AND score >= 60);

CREATE POLICY "Service role manages all signals" 
ON signals FOR ALL 
USING (auth.role() = 'service_role');

-- 6. Grant table permissions
GRANT SELECT, INSERT ON execution_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_trading_accounts TO authenticated; 
GRANT SELECT ON live_market_data TO authenticated;
GRANT SELECT ON exchange_feed_status TO authenticated;
GRANT SELECT ON signals TO authenticated;

-- Grant service role full access
GRANT ALL ON execution_orders TO service_role;
GRANT ALL ON user_trading_accounts TO service_role;
GRANT ALL ON live_market_data TO service_role;
GRANT ALL ON exchange_feed_status TO service_role;
GRANT ALL ON signals TO service_role;