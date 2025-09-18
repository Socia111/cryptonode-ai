-- Step 3: Fix execution_orders table issues

-- Drop all existing policies first  
DROP POLICY IF EXISTS "execution_orders_read_policy" ON execution_orders;
DROP POLICY IF EXISTS "execution_orders_insert_policy" ON execution_orders;  
DROP POLICY IF EXISTS "execution_orders_update_policy" ON execution_orders;
DROP POLICY IF EXISTS "execution_orders_anonymous_read" ON execution_orders;
DROP POLICY IF EXISTS "execution_orders_authenticated_all" ON execution_orders;

-- Create the simplest possible working policies
CREATE POLICY "execution_orders_public_read" ON execution_orders
  FOR SELECT USING (true);

CREATE POLICY "execution_orders_service_manage" ON execution_orders
  FOR ALL USING (true) WITH CHECK (true);

-- Clear old execution orders and insert fresh demo data
DELETE FROM execution_orders WHERE paper_mode = true;

-- Insert demo execution orders
INSERT INTO execution_orders (
  symbol, side, amount_usd, qty, leverage, paper_mode, status, 
  exchange_order_id, ret_code, ret_msg, raw_response, created_at, user_id
) VALUES
('BTCUSDT', 'Buy', 100, 0.001087, 1, true, 'filled', 'DEMO_BTC_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_BTC_001", "status": "filled", "avgPrice": 92100}', now() - interval '5 minutes', null),
('ETHUSDT', 'Sell', 200, 0.058480, 1, true, 'filled', 'DEMO_ETH_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_ETH_001", "status": "filled", "avgPrice": 3420}', now() - interval '10 minutes', null),
('SOLUSDT', 'Buy', 150, 0.617284, 1, true, 'filled', 'DEMO_SOL_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_SOL_001", "status": "filled", "avgPrice": 243}', now() - interval '15 minutes', null);