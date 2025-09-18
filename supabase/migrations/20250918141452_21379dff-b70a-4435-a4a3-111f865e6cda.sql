-- Fix RLS policies for user_trading_accounts table
DROP POLICY IF EXISTS "Authenticated users can manage trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Users can view their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Users can insert their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Users can update their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "user_trading_accounts_select_policy" ON user_trading_accounts;
DROP POLICY IF EXISTS "user_trading_accounts_insert_policy" ON user_trading_accounts;
DROP POLICY IF EXISTS "user_trading_accounts_update_policy" ON user_trading_accounts;

-- Create comprehensive RLS policies for user_trading_accounts
CREATE POLICY "user_trading_accounts_full_access" ON user_trading_accounts
FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  )
) WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  )
);

-- Fix RLS policies for exchange_feed_status table
DROP POLICY IF EXISTS "Authenticated users can read exchange feed status" ON exchange_feed_status;
DROP POLICY IF EXISTS "Public read access to exchange feed status" ON exchange_feed_status;
DROP POLICY IF EXISTS "Service role can manage exchange feed status" ON exchange_feed_status;

-- Create comprehensive RLS policies for exchange_feed_status
CREATE POLICY "exchange_feed_status_full_access" ON exchange_feed_status
FOR ALL USING (true) WITH CHECK (true);

-- Fix RLS policies for execution_orders table
DROP POLICY IF EXISTS "Anonymous can read paper orders" ON execution_orders;
DROP POLICY IF EXISTS "Authenticated users can manage execution orders" ON execution_orders;
DROP POLICY IF EXISTS "Public read access to paper orders" ON execution_orders;

-- Create comprehensive RLS policies for execution_orders
CREATE POLICY "execution_orders_full_access" ON execution_orders
FOR ALL USING (
  auth.uid() IS NOT NULL OR 
  auth.role() = 'service_role' OR 
  paper_mode = true
) WITH CHECK (
  auth.uid() IS NOT NULL OR 
  auth.role() = 'service_role' OR 
  paper_mode = true
);

-- Ensure all tables have proper RLS enabled
ALTER TABLE user_trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_feed_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_orders ENABLE ROW LEVEL SECURITY;