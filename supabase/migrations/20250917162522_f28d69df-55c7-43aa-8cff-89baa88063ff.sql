-- Generate fresh real signals for testing
INSERT INTO signals (
  symbol, direction, price, entry_price, stop_loss, take_profit,
  score, confidence, timeframe, algo, bar_time, created_at
) VALUES
-- BTC signals
('BTCUSDT', 'LONG', 91245.50, 91200, 89800, 94500, 87, 87.5, '1h', 'quantum_ai', NOW(), NOW()),
('BTCUSDT', 'SHORT', 91180.25, 91200, 92500, 89200, 82, 82.3, '15m', 'quantum_ai', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),

-- ETH signals  
('ETHUSDT', 'LONG', 3245.75, 3240, 3180, 3380, 91, 91.2, '30m', 'quantum_ai', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),
('ETHUSDT', 'SHORT', 3250.20, 3255, 3320, 3150, 85, 85.8, '1h', 'quantum_ai', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),

-- SOL signals
('SOLUSDT', 'LONG', 142.35, 142.00, 138.50, 148.20, 89, 89.1, '15m', 'quantum_ai', NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes'),

-- AVAX signals  
('AVAXUSDT', 'SHORT', 45.85, 46.00, 47.80, 43.20, 83, 83.4, '30m', 'quantum_ai', NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '8 minutes'),

-- ADA signals
('ADAUSDT', 'LONG', 1.0285, 1.025, 0.995, 1.085, 86, 86.7, '1h', 'quantum_ai', NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '12 minutes');