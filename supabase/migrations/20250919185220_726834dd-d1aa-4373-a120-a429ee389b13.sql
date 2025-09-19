-- Fix all anonymous access policies to require authentication
-- Update automated_trading_config policies
DROP POLICY IF EXISTS "automated_trading_manage_own" ON public.automated_trading_config;
DROP POLICY IF EXISTS "automated_trading_read_own" ON public.automated_trading_config;

CREATE POLICY "Authenticated users can manage own trading config" 
ON public.automated_trading_config 
FOR ALL 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Update audit_log policies
DROP POLICY IF EXISTS "Allow service role to manage audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Service role can manage audit logs for edge functions" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view own audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_log;

CREATE POLICY "Authenticated users can view own audit logs" 
ON public.audit_log 
FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage audit logs" 
ON public.audit_log 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update exchange_feed_status policies
DROP POLICY IF EXISTS "Authenticated read exchange feed status" ON public.exchange_feed_status;
DROP POLICY IF EXISTS "Service role manages exchange feed status" ON public.exchange_feed_status;

CREATE POLICY "Authenticated users can read exchange feed status" 
ON public.exchange_feed_status 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages exchange feed status" 
ON public.exchange_feed_status 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update execution_orders policies
DROP POLICY IF EXISTS "Service role manages execution orders" ON public.execution_orders;
DROP POLICY IF EXISTS "Users view own execution orders" ON public.execution_orders;

CREATE POLICY "Authenticated users can view own execution orders" 
ON public.execution_orders 
FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages execution orders" 
ON public.execution_orders 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update execution_queue policies
DROP POLICY IF EXISTS "Service role can manage execution queue" ON public.execution_queue;
DROP POLICY IF EXISTS "Users can view own execution queue" ON public.execution_queue;

CREATE POLICY "Authenticated users can view own execution queue" 
ON public.execution_queue 
FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages execution queue" 
ON public.execution_queue 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create default automated trading config for existing users
INSERT INTO automated_trading_config (
  user_id, 
  enabled, 
  credit_allowance, 
  credits_used,
  max_daily_trades,
  risk_per_trade,
  min_signal_score,
  max_concurrent_trades,
  active_exchanges,
  preferred_timeframes,
  excluded_symbols,
  trading_hours
) 
SELECT 
  id as user_id,
  false,
  250,
  0,
  10,
  0.02,
  75,
  3,
  ARRAY['bybit', 'binance', 'okx'],
  ARRAY['15m', '30m', '1h'],
  ARRAY[]::text[],
  '{"start": "00:00", "end": "23:59", "timezone": "UTC"}'::jsonb
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM automated_trading_config WHERE user_id = auth.users.id
);

-- Update whitelist to include all major crypto pairs
UPDATE whitelist_settings 
SET whitelist_pairs = ARRAY[
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
  'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT',
  'UNIUSDT', 'FILUSDT', 'TRXUSDT', 'ETCUSDT', 'XLMUSDT', 'VETUSDT',
  'ICPUSDT', 'AAVEUSDT', 'EOSUSDT', 'XTZUSDT', 'ALGOUSDT', 'MKRUSDT',
  'COMPUSDT', 'YFIUSDT', 'SUSHIUSDT', 'SNXUSDT', 'CRVUSDT', 'UMAUSDT',
  'RENUSDT', 'KNCUSDT', 'ZRXUSDT', 'STORJUSDT', 'BANDUSDT', 'BALUSDT',
  'ENJUSDT', 'MANAUSDT', 'SANDUSDT', 'CHZUSDT', 'GALAUSDT', 'AXSUSDT',
  'FTMUSDT', 'HNTUSDT', 'NEARUSDT', 'FLOWUSDT', 'KSMUSDT', 'ONEUSDT',
  'ZILUSDT', 'WAVESUSDT', 'QTUMUSDT', 'OMGUSDT', 'BATUSDT', 'ZECUSDT'
],
whitelist_enabled = true,
max_symbols = 200,
auto_update = true
WHERE id = (SELECT id FROM whitelist_settings ORDER BY created_at DESC LIMIT 1);