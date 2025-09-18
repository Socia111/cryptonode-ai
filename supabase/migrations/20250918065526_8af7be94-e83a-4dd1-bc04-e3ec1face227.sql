-- Step 1: Fix execution_orders RLS policies completely
DROP POLICY IF EXISTS "Allow anonymous read access to paper trading orders" ON execution_orders;
DROP POLICY IF EXISTS "Allow authenticated users to manage their own orders" ON execution_orders;

-- Create simple, working policies
CREATE POLICY "execution_orders_read_policy" ON execution_orders
  FOR SELECT USING (
    paper_mode = true OR 
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "execution_orders_insert_policy" ON execution_orders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role' OR
    user_id IS NULL
  );

CREATE POLICY "execution_orders_update_policy" ON execution_orders
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Fix exchange_feed_status policies
DROP POLICY IF EXISTS "Exchange feed status is publicly readable" ON exchange_feed_status;
DROP POLICY IF EXISTS "Service role can manage exchange feed status" ON exchange_feed_status;

CREATE POLICY "exchange_feed_status_read_policy" ON exchange_feed_status
  FOR SELECT USING (true);

CREATE POLICY "exchange_feed_status_manage_policy" ON exchange_feed_status
  FOR ALL USING (true) WITH CHECK (true);