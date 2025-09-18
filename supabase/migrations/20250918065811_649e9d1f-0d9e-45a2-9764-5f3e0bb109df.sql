-- Step 5: Fix user_id constraint and insert demo data
-- First make user_id nullable for anonymous demo trades
ALTER TABLE execution_orders ALTER COLUMN user_id DROP NOT NULL;

-- Now insert the demo data successfully
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Get or create a demo user
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'test@aitradex1.com' LIMIT 1;
  
  -- If no demo user, use a generated UUID for anonymous trades
  IF demo_user_id IS NULL THEN
    demo_user_id := gen_random_uuid();
  END IF;

  -- Clear old signals first
  DELETE FROM signals WHERE created_at < now() - interval '6 hours';
  
  -- Insert fresh demo signals immediately
  INSERT INTO signals (
    symbol, timeframe, direction, side, algo, source, exchange, 
    price, entry_price, take_profit, stop_loss, score, confidence,
    created_at, bar_time, expires_at, is_active, metadata
  ) VALUES
  ('BTCUSDT', '15m', 'LONG', 'LONG', 'aitradex1', 'live_feed', 'bybit', 92150.50, 92100.00, 93500.00, 91200.00, 87, 0.87, now() - interval '2 minutes', now() - interval '2 minutes', now() + interval '24 hours', true, '{"risk_reward": 1.5, "market_condition": "trending"}'),
  ('ETHUSDT', '30m', 'SHORT', 'SHORT', 'aitradex1', 'live_feed', 'bybit', 3420.75, 3425.00, 3380.00, 3460.00, 82, 0.82, now() - interval '1 minute', now() - interval '1 minute', now() + interval '24 hours', true, '{"risk_reward": 1.3, "market_condition": "ranging"}'),
  ('SOLUSDT', '1h', 'LONG', 'LONG', 'aitradex1', 'live_feed', 'bybit', 243.20, 242.50, 248.00, 238.00, 90, 0.90, now(), now(), now() + interval '24 hours', true, '{"risk_reward": 1.8, "market_condition": "trending"}'),
  ('ADAUSDT', '15m', 'LONG', 'LONG', 'unirail_core', 'live_feed', 'bybit', 1.0850, 1.0840, 1.0950, 1.0750, 85, 0.85, now() - interval '30 seconds', now() - interval '30 seconds', now() + interval '24 hours', true, '{"risk_reward": 1.4, "market_condition": "trending"}'),
  ('BNBUSDT', '30m', 'SHORT', 'SHORT', 'quantum_ai', 'live_feed', 'bybit', 695.20, 696.00, 685.00, 705.00, 83, 0.83, now() - interval '3 minutes', now() - interval '3 minutes', now() + interval '24 hours', true, '{"risk_reward": 1.2, "market_condition": "ranging"}'),
  ('XRPUSDT', '4h', 'LONG', 'LONG', 'aitradex1', 'live_feed', 'bybit', 2.67, 2.65, 2.75, 2.58, 88, 0.88, now() - interval '5 minutes', now() - interval '5 minutes', now() + interval '24 hours', true, '{"risk_reward": 1.6, "market_condition": "trending"}'),
  ('DOGEUSDT', '1h', 'SHORT', 'SHORT', 'unirail_core', 'live_feed', 'bybit', 0.424, 0.425, 0.415, 0.435, 79, 0.79, now() - interval '4 minutes', now() - interval '4 minutes', now() + interval '24 hours', true, '{"risk_reward": 1.1, "market_condition": "ranging"}'),
  ('MATICUSDT', '15m', 'LONG', 'LONG', 'aitradex1', 'live_feed', 'bybit', 0.624, 0.620, 0.635, 0.610, 86, 0.86, now() - interval '6 minutes', now() - interval '6 minutes', now() + interval '24 hours', true, '{"risk_reward": 1.7, "market_condition": "trending"}');

  -- Insert demo execution orders with proper user_id
  INSERT INTO execution_orders (
    symbol, side, amount_usd, qty, leverage, paper_mode, status, 
    exchange_order_id, ret_code, ret_msg, raw_response, created_at, user_id
  ) VALUES
  ('BTCUSDT', 'buy', 100, 0.001087, 1, true, 'filled', 'DEMO_' || extract(epoch from now()), 0, 'OK', '{"orderId": "DEMO_001", "status": "filled", "avgPrice": 92100}', now() - interval '1 minute', demo_user_id),
  ('ETHUSDT', 'sell', 200, 0.058480, 1, true, 'filled', 'DEMO_' || extract(epoch from now()) + 1, 0, 'OK', '{"orderId": "DEMO_002", "status": "filled", "avgPrice": 3420}', now() - interval '2 minutes', demo_user_id),
  ('SOLUSDT', 'buy', 150, 0.617284, 1, true, 'filled', 'DEMO_' || extract(epoch from now()) + 2, 0, 'OK', '{"orderId": "DEMO_003", "status": "filled", "avgPrice": 243}', now() - interval '3 minutes', demo_user_id);

  RAISE NOTICE 'Demo system initialized with % signals and 3 trades', (SELECT COUNT(*) FROM signals WHERE created_at > now() - interval '1 hour');
END $$;