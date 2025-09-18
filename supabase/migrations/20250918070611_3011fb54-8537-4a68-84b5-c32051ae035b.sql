-- Step 4: Make user_id nullable permanently and fix demo data

-- Make user_id nullable to allow anonymous demo trades
ALTER TABLE execution_orders ALTER COLUMN user_id DROP NOT NULL;

-- Drop all existing policies  
DROP POLICY IF EXISTS "execution_orders_anonymous_read" ON execution_orders;
DROP POLICY IF EXISTS "execution_orders_authenticated_all" ON execution_orders;

-- Create working RLS policies
CREATE POLICY "execution_orders_select_policy" ON execution_orders
  FOR SELECT USING (true); -- Allow everyone to read all execution orders

CREATE POLICY "execution_orders_insert_policy" ON execution_orders
  FOR INSERT WITH CHECK (true); -- Allow everyone to insert (for demo purposes)

CREATE POLICY "execution_orders_update_policy" ON execution_orders
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role' OR
    user_id IS NULL
  );

-- Clear old demo orders
DELETE FROM execution_orders WHERE exchange_order_id LIKE 'DEMO_%';

-- Insert demo execution orders with NULL user_id
INSERT INTO execution_orders (
  symbol, side, amount_usd, qty, leverage, paper_mode, status, 
  exchange_order_id, ret_code, ret_msg, raw_response, created_at, user_id
) VALUES
('BTCUSDT', 'Buy', 100, 0.001087, 1, true, 'filled', 'DEMO_BTC_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_BTC_001", "status": "filled", "avgPrice": 92100}', now() - interval '5 minutes', null),
('ETHUSDT', 'Sell', 200, 0.058480, 1, true, 'filled', 'DEMO_ETH_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_ETH_001", "status": "filled", "avgPrice": 3420}', now() - interval '10 minutes', null),
('SOLUSDT', 'Buy', 150, 0.617284, 1, true, 'filled', 'DEMO_SOL_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_SOL_001", "status": "filled", "avgPrice": 243}', now() - interval '15 minutes', null),
('ADAUSDT', 'Buy', 120, 110.8108, 1, true, 'filled', 'DEMO_ADA_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_ADA_001", "status": "filled", "avgPrice": 1.085}', now() - interval '20 minutes', null),
('XRPUSDT', 'Sell', 180, 67.4157, 1, true, 'filled', 'DEMO_XRP_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_XRP_001", "status": "filled", "avgPrice": 2.67}', now() - interval '25 minutes', null);