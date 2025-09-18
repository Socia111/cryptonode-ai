-- Fix RLS policies for execution_orders table
DROP POLICY IF EXISTS "execution_orders_full_access" ON execution_orders;

CREATE POLICY "execution_orders_authenticated_access" 
ON execution_orders FOR ALL 
USING (
  auth.uid() IS NOT NULL OR 
  auth.role() = 'service_role' OR 
  paper_mode = true
) 
WITH CHECK (
  auth.uid() IS NOT NULL OR 
  auth.role() = 'service_role' OR 
  paper_mode = true
);

-- Fix RLS policies for exchange_feed_status table  
DROP POLICY IF EXISTS "exchange_feed_status_full_access" ON exchange_feed_status;

CREATE POLICY "exchange_feed_status_read_access" 
ON exchange_feed_status FOR SELECT 
USING (true);

CREATE POLICY "exchange_feed_status_write_access" 
ON exchange_feed_status FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

CREATE POLICY "exchange_feed_status_update_access" 
ON exchange_feed_status FOR UPDATE 
USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL)
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- Fix RLS policies for user_trading_accounts table
DROP POLICY IF EXISTS "user_trading_accounts_full_access" ON user_trading_accounts;

CREATE POLICY "user_trading_accounts_owner_access" 
ON user_trading_accounts FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  )
) 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  )
);