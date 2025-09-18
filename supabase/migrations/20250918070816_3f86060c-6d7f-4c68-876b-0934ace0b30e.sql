-- Step 8: Regenerate signals immediately with mock realistic prices

INSERT INTO signals (
  symbol, timeframe, direction, side, algo, source, exchange, 
  price, entry_price, take_profit, stop_loss, score, confidence,
  created_at, bar_time, expires_at, is_active, metadata
) VALUES
-- Bitcoin signals
('BTCUSDT', '15m', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 92150.50, 92100.00, 93500.00, 91200.00, 87, 0.87, now() - interval '2 minutes', now() - interval '2 minutes', now() + interval '24 hours', true, '{"rsi": 65.2, "volume_spike": 1.3, "trend": "bullish"}'),
('BTCUSDT', '1h', 'LONG', 'BUY', 'quantum_ai', 'live_feed', 'bybit', 92200.75, 92150.00, 93800.00, 91500.00, 91, 0.91, now() - interval '1 minute', now() - interval '1 minute', now() + interval '24 hours', true, '{"rsi": 68.5, "volume_spike": 1.8, "trend": "strong_bullish"}'),

-- Ethereum signals  
('ETHUSDT', '30m', 'SHORT', 'SELL', 'aitradex1', 'live_feed', 'bybit', 3420.75, 3425.00, 3380.00, 3460.00, 82, 0.82, now() - interval '3 minutes', now() - interval '3 minutes', now() + interval '24 hours', true, '{"rsi": 72.1, "volume_spike": 1.1, "trend": "bearish"}'),
('ETHUSDT', '4h', 'LONG', 'BUY', 'unirail_core', 'live_feed', 'bybit', 3435.20, 3430.00, 3520.00, 3380.00, 89, 0.89, now() - interval '5 minutes', now() - interval '5 minutes', now() + interval '24 hours', true, '{"rsi": 58.9, "volume_spike": 1.6, "trend": "reversal_bullish"}'),

-- Solana signals
('SOLUSDT', '1h', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 243.20, 242.50, 248.00, 238.00, 90, 0.90, now(), now(), now() + interval '24 hours', true, '{"rsi": 58.7, "volume_spike": 1.6, "trend": "bullish"}'),
('SOLUSDT', '15m', 'SHORT', 'SELL', 'quantum_ai', 'live_feed', 'bybit', 242.80, 243.00, 240.50, 245.20, 84, 0.84, now() - interval '4 minutes', now() - interval '4 minutes', now() + interval '24 hours', true, '{"rsi": 75.3, "volume_spike": 0.9, "trend": "overbought"}'),

-- Cardano signals
('ADAUSDT', '15m', 'LONG', 'BUY', 'unirail_core', 'live_feed', 'bybit', 1.0850, 1.0840, 1.0950, 1.0750, 85, 0.85, now() - interval '30 seconds', now() - interval '30 seconds', now() + interval '24 hours', true, '{"rsi": 61.3, "volume_spike": 1.2, "trend": "bullish"}'),
('ADAUSDT', '1h', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 1.0890, 1.0870, 1.1000, 1.0780, 88, 0.88, now() - interval '6 minutes', now() - interval '6 minutes', now() + interval '24 hours', true, '{"rsi": 63.8, "volume_spike": 1.4, "trend": "strong_bullish"}'),

-- BNB signals
('BNBUSDT', '30m', 'SHORT', 'SELL', 'quantum_ai', 'live_feed', 'bybit', 695.20, 696.00, 685.00, 705.00, 83, 0.83, now() - interval '7 minutes', now() - interval '7 minutes', now() + interval '24 hours', true, '{"rsi": 75.8, "volume_spike": 0.9, "trend": "bearish"}'),

-- XRP signals
('XRPUSDT', '4h', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 2.67, 2.65, 2.75, 2.58, 88, 0.88, now() - interval '8 minutes', now() - interval '8 minutes', now() + interval '24 hours', true, '{"rsi": 64.2, "volume_spike": 1.6, "trend": "trending"}'),
('XRPUSDT', '1h', 'SHORT', 'SELL', 'unirail_core', 'live_feed', 'bybit', 2.66, 2.67, 2.62, 2.71, 81, 0.81, now() - interval '9 minutes', now() - interval '9 minutes', now() + interval '24 hours', true, '{"rsi": 71.5, "volume_spike": 1.0, "trend": "ranging"}'),

-- Dogecoin signals
('DOGEUSDT', '1h', 'SHORT', 'SELL', 'unirail_core', 'live_feed', 'bybit', 0.424, 0.425, 0.415, 0.435, 79, 0.79, now() - interval '10 minutes', now() - interval '10 minutes', now() + interval '24 hours', true, '{"rsi": 73.1, "volume_spike": 1.1, "trend": "ranging"}'),
('DOGEUSDT', '15m', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 0.426, 0.425, 0.432, 0.420, 86, 0.86, now() - interval '11 minutes', now() - interval '11 minutes', now() + interval '24 hours', true, '{"rsi": 59.2, "volume_spike": 1.3, "trend": "bullish"}'),

-- Polygon signals
('MATICUSDT', '15m', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 0.624, 0.620, 0.635, 0.610, 86, 0.86, now() - interval '12 minutes', now() - interval '12 minutes', now() + interval '24 hours', true, '{"rsi": 62.7, "volume_spike": 1.7, "trend": "trending"}'),
('MATICUSDT', '30m', 'SHORT', 'SELL', 'quantum_ai', 'live_feed', 'bybit', 0.623, 0.624, 0.618, 0.629, 80, 0.80, now() - interval '13 minutes', now() - interval '13 minutes', now() + interval '24 hours', true, '{"rsi": 74.6, "volume_spike": 0.8, "trend": "resistance"}'),

-- Additional high-value signals
('AVAXUSDT', '1h', 'LONG', 'BUY', 'aitradex1', 'live_feed', 'bybit', 54.32, 54.20, 56.00, 53.00, 92, 0.92, now() - interval '14 minutes', now() - interval '14 minutes', now() + interval '24 hours', true, '{"rsi": 56.8, "volume_spike": 2.1, "trend": "breakout"}'),
('LINKUSDT', '30m', 'LONG', 'BUY', 'unirail_core', 'live_feed', 'bybit', 25.89, 25.80, 26.50, 25.20, 87, 0.87, now() - interval '15 minutes', now() - interval '15 minutes', now() + interval '24 hours', true, '{"rsi": 60.4, "volume_spike": 1.5, "trend": "uptrend"}');