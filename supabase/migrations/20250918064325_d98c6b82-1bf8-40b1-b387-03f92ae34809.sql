-- Create a comprehensive system initialization function
CREATE OR REPLACE FUNCTION public.initialize_demo_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  signal_count int;
BEGIN
  -- Insert demo signals if none exist
  SELECT COUNT(*) INTO signal_count FROM signals WHERE created_at > now() - interval '1 hour';
  
  IF signal_count < 5 THEN
    -- Clear old signals
    DELETE FROM signals WHERE created_at < now() - interval '24 hours';
    
    -- Insert fresh demo signals
    INSERT INTO signals (symbol, timeframe, direction, price, entry_price, take_profit, stop_loss, score, confidence, source, algo, exchange, created_at, bar_time, metadata) VALUES
    ('BTCUSDT', '15m', 'BUY', 92150.50, 92100.00, 93500.00, 91200.00, 87, 0.87, 'ccxt', 'AITRADEX1', 'bybit', now() - interval '5 minutes', now() - interval '5 minutes', '{"rsi": 65.2, "volume_spike": 1.3, "trend": "bullish"}'),
    ('ETHUSDT', '30m', 'SELL', 3420.75, 3425.00, 3380.00, 3460.00, 82, 0.82, 'ccxt', 'AITRADEX1', 'bybit', now() - interval '3 minutes', now() - interval '3 minutes', '{"rsi": 72.1, "volume_spike": 1.1, "trend": "bearish"}'),
    ('SOLUSDT', '1h', 'BUY', 243.20, 242.50, 248.00, 238.00, 90, 0.90, 'ccxt', 'AITRADEX1', 'bybit', now() - interval '2 minutes', now() - interval '2 minutes', '{"rsi": 58.7, "volume_spike": 1.6, "trend": "bullish"}'),
    ('ADAUSDT', '15m', 'BUY', 1.0850, 1.0840, 1.0950, 1.0750, 85, 0.85, 'ccxt', 'AITRADEX1', 'bybit', now() - interval '1 minute', now() - interval '1 minute', '{"rsi": 61.3, "volume_spike": 1.2, "trend": "bullish"}'),
    ('BNBUSDT', '30m', 'SELL', 695.20, 696.00, 685.00, 705.00, 83, 0.83, 'ccxt', 'AITRADEX1', 'bybit', now(), now(), '{"rsi": 75.8, "volume_spike": 0.9, "trend": "bearish"}');
  END IF;

  -- Update system status
  INSERT INTO exchange_feed_status (exchange, status, last_update, symbols_tracked, error_count)
  VALUES ('bybit', 'active', now(), 25, 0)
  ON CONFLICT (exchange) 
  DO UPDATE SET 
    status = 'active',
    last_update = now(),
    symbols_tracked = 25,
    error_count = 0;

  result := jsonb_build_object(
    'success', true,
    'signals_created', signal_count,
    'system_status', 'active',
    'timestamp', now()
  );

  RETURN result;
END;
$$;