-- Step 6: Add realistic pricing data and more signals

-- Clear old signals and add fresh realistic ones
DELETE FROM signals WHERE created_at < now() - interval '1 hour';

-- Insert realistic trading signals with proper pricing
INSERT INTO signals (
  symbol, timeframe, direction, side, algo, source, exchange, 
  price, entry_price, take_profit, stop_loss, score, confidence,
  created_at, bar_time, expires_at, is_active, metadata
) VALUES
-- Bitcoin signals
('BTCUSDT', '15m', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 92150.50, 92100.00, 93500.00, 91200.00, 87, 0.87, now() - interval '2 minutes', now() - interval '2 minutes', now() + interval '24 hours', true, '{"rsi": 58.2, "volume_spike": 1.4, "trend": "bullish", "volatility": 0.023}'),
('BTCUSDT', '1h', 'SHORT', 'SELL', 'quantum_ai', 'live_feed', 'bybit', 92200.75, 92250.00, 91800.00, 92800.00, 82, 0.82, now() - interval '5 minutes', now() - interval '5 minutes', now() + interval '24 hours', true, '{"rsi": 73.1, "volume_spike": 0.9, "trend": "bearish", "volatility": 0.028}'),

-- Ethereum signals  
('ETHUSDT', '30m', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 3420.75, 3415.00, 3480.00, 3370.00, 89, 0.89, now() - interval '1 minute', now() - interval '1 minute', now() + interval '24 hours', true, '{"rsi": 62.7, "volume_spike": 1.6, "trend": "bullish", "volatility": 0.031}'),
('ETHUSDT', '4h', 'SHORT', 'SELL', 'unirail_core', 'live_feed', 'bybit', 3435.20, 3440.00, 3390.00, 3480.00, 79, 0.79, now() - interval '8 minutes', now() - interval '8 minutes', now() + interval '24 hours', true, '{"rsi": 76.4, "volume_spike": 0.8, "trend": "ranging", "volatility": 0.025}'),

-- Solana signals
('SOLUSDT', '1h', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 243.20, 242.50, 248.00, 238.00, 91, 0.91, now(), now(), now() + interval '24 hours', true, '{"rsi": 55.8, "volume_spike": 1.8, "trend": "bullish", "volatility": 0.045}'),
('SOLUSDT', '15m', 'SHORT', 'SELL', 'quantum_ai', 'live_feed', 'bybit', 244.80, 245.00, 240.00, 248.50, 84, 0.84, now() - interval '3 minutes', now() - interval '3 minutes', now() + interval '24 hours', true, '{"rsi": 69.2, "volume_spike": 1.1, "trend": "bearish", "volatility": 0.038}'),

-- Cardano signals
('ADAUSDT', '15m', 'LONG', 'BUY', 'unirail_core', 'live_feed', 'bybit', 1.0850, 1.0840, 1.0950, 1.0750, 85, 0.85, now() - interval '30 seconds', now() - interval '30 seconds', now() + interval '24 hours', true, '{"rsi": 59.5, "volume_spike": 1.3, "trend": "bullish", "volatility": 0.029}'),
('ADAUSDT', '1h', 'SHORT', 'SELL', 'aitradex1', 'live_feed', 'bybit', 1.0920, 1.0930, 1.0850, 1.0980, 78, 0.78, now() - interval '12 minutes', now() - interval '12 minutes', now() + interval '24 hours', true, '{"rsi": 71.8, "volume_spike": 0.9, "trend": "ranging", "volatility": 0.033}'),

-- BNB signals
('BNBUSDT', '30m', 'LONG', 'BUY', 'quantum_ai', 'live_feed', 'bybit', 695.20, 694.00, 710.00, 685.00, 86, 0.86, now() - interval '6 minutes', now() - interval '6 minutes', now() + interval '24 hours', true, '{"rsi": 61.2, "volume_spike": 1.2, "trend": "bullish", "volatility": 0.027}'),
('BNBUSDT', '4h', 'SHORT', 'SELL', 'aitradex1', 'live_feed', 'bybit', 698.50, 700.00, 690.00, 708.00, 80, 0.80, now() - interval '15 minutes', now() - interval '15 minutes', now() + interval '24 hours', true, '{"rsi": 74.5, "volume_spike": 0.8, "trend": "bearish", "volatility": 0.024}'),

-- XRP signals
('XRPUSDT', '4h', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 2.67, 2.65, 2.75, 2.58, 88, 0.88, now() - interval '4 minutes', now() - interval '4 minutes', now() + interval '24 hours', true, '{"rsi": 57.3, "volume_spike": 1.5, "trend": "bullish", "volatility": 0.041}'),
('XRPUSDT', '15m', 'SHORT', 'SELL', 'unirail_core', 'live_feed', 'bybit', 2.69, 2.70, 2.63, 2.76, 81, 0.81, now() - interval '7 minutes', now() - interval '7 minutes', now() + interval '24 hours', true, '{"rsi": 72.6, "volume_spike": 1.0, "trend": "ranging", "volatility": 0.036}'),

-- Dogecoin signals
('DOGEUSDT', '1h', 'LONG', 'BUY', 'quantum_ai', 'live_feed', 'bybit', 0.424, 0.422, 0.435, 0.415, 83, 0.83, now() - interval '9 minutes', now() - interval '9 minutes', now() + interval '24 hours', true, '{"rsi": 60.1, "volume_spike": 1.7, "trend": "bullish", "volatility": 0.052}'),
('DOGEUSDT', '30m', 'SHORT', 'SELL', 'aitradex1', 'live_feed', 'bybit', 0.426, 0.427, 0.418, 0.433, 77, 0.77, now() - interval '11 minutes', now() - interval '11 minutes', now() + interval '24 hours', true, '{"rsi": 68.9, "volume_spike": 0.9, "trend": "bearish", "volatility": 0.048}'),

-- Polygon signals
('MATICUSDT', '15m', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 0.624, 0.620, 0.635, 0.610, 86, 0.86, now() - interval '1 minute', now() - interval '1 minute', now() + interval '24 hours', true, '{"rsi": 56.8, "volume_spike": 1.4, "trend": "bullish", "volatility": 0.039}'),
('MATICUSDT', '1h', 'SHORT', 'SELL', 'unirail_core', 'live_feed', 'bybit', 0.628, 0.630, 0.615, 0.640, 79, 0.79, now() - interval '13 minutes', now() - interval '13 minutes', now() + interval '24 hours', true, '{"rsi": 70.4, "volume_spike": 0.8, "trend": "ranging", "volatility": 0.042}');

-- Update exchange feed status
UPDATE exchange_feed_status 
SET last_update = now(), symbols_tracked = 8, error_count = 0 
WHERE exchange = 'demo_live_feed';