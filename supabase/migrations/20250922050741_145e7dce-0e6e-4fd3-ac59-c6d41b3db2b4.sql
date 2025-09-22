-- Clean old signals and insert fresh ones
DELETE FROM signals WHERE created_at < now() - interval '6 hours';

-- Insert fresh demo signals for immediate display
INSERT INTO signals (
  symbol, direction, timeframe, price, entry_price, stop_loss, take_profit, 
  score, confidence, source, bar_time, metadata, is_active
) VALUES 
(
  'BTCUSDT', 'LONG', '1h', 42150.50, 42150.50, 41650.00, 43200.00, 
  75, 0.75, 'fresh_live_demo', now(), 
  '{"rsi": 35, "macd": "bullish", "volume_spike": true}', true
),
(
  'ETHUSDT', 'LONG', '1h', 2485.25, 2485.25, 2435.00, 2580.00, 
  72, 0.72, 'fresh_live_demo', now(), 
  '{"support_level": "confirmed", "momentum": "strong"}', true
),
(
  'BNBUSDT', 'SHORT', '1h', 315.80, 315.80, 325.00, 305.00, 
  68, 0.68, 'fresh_live_demo', now(), 
  '{"resistance": "strong", "overbought": true}', true
);