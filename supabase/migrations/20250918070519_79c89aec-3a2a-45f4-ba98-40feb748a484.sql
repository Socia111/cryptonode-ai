-- Step 4: Make user_id nullable permanently and fix data

-- Make user_id nullable 
ALTER TABLE execution_orders ALTER COLUMN user_id DROP NOT NULL;

-- Now insert demo data with proper UUID
DO $$
DECLARE
  demo_user_id UUID := 'ea52a338-c40d-4809-9014-10151b3af9af'; -- Use the existing authenticated user ID from logs
BEGIN
  -- Clear old execution orders
  DELETE FROM execution_orders WHERE paper_mode = true;

  -- Insert demo execution orders with valid user_id
  INSERT INTO execution_orders (
    symbol, side, amount_usd, qty, leverage, paper_mode, status, 
    exchange_order_id, ret_code, ret_msg, raw_response, created_at, user_id
  ) VALUES
  ('BTCUSDT', 'Buy', 100, 0.001087, 1, true, 'filled', 'DEMO_BTC_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_BTC_001", "status": "filled", "avgPrice": 92100}', now() - interval '5 minutes', demo_user_id),
  ('ETHUSDT', 'Sell', 200, 0.058480, 1, true, 'filled', 'DEMO_ETH_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_ETH_001", "status": "filled", "avgPrice": 3420}', now() - interval '10 minutes', demo_user_id),
  ('SOLUSDT', 'Buy', 150, 0.617284, 1, true, 'filled', 'DEMO_SOL_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_SOL_001", "status": "filled", "avgPrice": 243}', now() - interval '15 minutes', demo_user_id);

  RAISE NOTICE 'Inserted % execution orders', (SELECT COUNT(*) FROM execution_orders WHERE paper_mode = true);
END $$;