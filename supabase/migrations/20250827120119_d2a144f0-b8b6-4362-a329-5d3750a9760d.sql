-- Insert sample signals for testing the AItradeX1 system
INSERT INTO public.signals (
  algo, exchange, symbol, timeframe, direction, bar_time, price, score, atr, sl, tp, hvp, filters, indicators, relaxed_mode
) VALUES 
(
  'AItradeX1', 'bybit', 'BTCUSDT', '1h', 'LONG', 
  NOW() - INTERVAL '1 hour', 65234.50, 87.5, 412.3, 64611.05, 66679.95, 72.4,
  '{"trend": true, "adx": true, "dmi": true, "stoch": true, "volume": true, "obv": true, "hvp": true, "spread": true, "breakout": true}'::jsonb,
  '{"ema21": 65100.2, "sma200": 63800.5, "adx": 31.2, "diPlus": 26.8, "diMinus": 18.4, "stochK": 28.3, "stochD": 31.7, "obv": 145623789, "obvEma": 142156234, "hvp": 72.4, "atr": 412.3, "volSma21": 1234567, "spread": 0.045, "breakoutHigh": 65200.0}'::jsonb,
  false
),
(
  'AItradeX1', 'bybit', 'ETHUSDT', '1h', 'SHORT', 
  NOW() - INTERVAL '2 hours', 3456.78, 82.1, 28.9, 3500.13, 3384.43, 68.2,
  '{"trend": true, "adx": true, "dmi": true, "stoch": true, "volume": true, "obv": true, "hvp": true, "spread": true, "breakout": true}'::jsonb,
  '{"ema21": 3460.1, "sma200": 3520.8, "adx": 29.8, "diPlus": 19.2, "diMinus": 27.5, "stochK": 71.2, "stochD": 68.9, "obv": 98765432, "obvEma": 101234567, "hvp": 68.2, "atr": 28.9, "volSma21": 567890, "spread": 0.038, "breakoutHigh": 3480.0}'::jsonb,
  false
),
(
  'AItradeX1', 'bybit', 'SOLUSDT', '1h', 'LONG', 
  NOW() - INTERVAL '30 minutes', 234.56, 91.3, 7.8, 222.86, 253.26, 79.1,
  '{"trend": true, "adx": true, "dmi": true, "stoch": true, "volume": true, "obv": true, "hvp": true, "spread": true, "breakout": true}'::jsonb,
  '{"ema21": 233.8, "sma200": 225.4, "adx": 33.7, "diPlus": 29.6, "diMinus": 16.8, "stochK": 22.1, "stochD": 26.3, "obv": 23456789, "obvEma": 22145678, "hvp": 79.1, "atr": 7.8, "volSma21": 345678, "spread": 0.028, "breakoutHigh": 235.2}'::jsonb,
  false
),
(
  'AItradeX1', 'bybit', 'ADAUSDT', '1h', 'LONG', 
  NOW() - INTERVAL '45 minutes', 1.2345, 75.8, 0.045, 1.1670, 1.3245, 61.5,
  '{"trend": true, "adx": true, "dmi": true, "stoch": true, "volume": true, "obv": true, "hvp": true, "spread": true, "breakout": true}'::jsonb,
  '{"ema21": 1.2301, "sma200": 1.1987, "adx": 28.4, "diPlus": 24.3, "diMinus": 18.9, "stochK": 32.7, "stochD": 29.8, "obv": 87654321, "obvEma": 85432190, "hvp": 61.5, "atr": 0.045, "volSma21": 234567, "spread": 0.041, "breakoutHigh": 1.2380}'::jsonb,
  false
);

-- Insert a scan record
INSERT INTO public.scans (
  exchange, timeframe, started_at, finished_at, symbols_count, signals_count, relaxed_mode
) VALUES (
  'bybit', '1h', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '58 minutes', 15, 4, false
);

-- Insert alerts log entries
INSERT INTO public.alerts_log (
  signal_id, channel, payload, status, response
) VALUES 
(
  (SELECT id FROM public.signals WHERE symbol = 'BTCUSDT' LIMIT 1),
  'telegram', 
  '{"message": "🚀 AItradeX1 LONG Signal\\nBTCUSDT 1h @ $65,234.50\\nScore: 87.5% | HVP: 72.4%\\nSL: $64,611 | TP: $66,680"}'::jsonb,
  'sent',
  '{"status": 200, "message_id": 12345}'::jsonb
),
(
  (SELECT id FROM public.signals WHERE symbol = 'SOLUSDT' LIMIT 1),
  'telegram',
  '{"message": "🚀 AItradeX1 LONG Signal\\nSOLUSDT 1h @ $234.56\\nScore: 91.3% | HVP: 79.1%\\nSL: $222.86 | TP: $253.26"}'::jsonb,
  'sent',
  '{"status": 200, "message_id": 12346}'::jsonb
);