-- Insert sample SPYNX portfolio data for testing only (without sample signals and quantum data)
INSERT INTO public.spynx_portfolios (portfolio_name, score, risk_level, total_trades, win_rate, roi, max_drawdown, sharpe_ratio, metadata) VALUES
('Alpha Momentum Pro', 95.7, 'MEDIUM', 847, 0.78, 245.6, -12.3, 2.4, '{"strategy": "momentum", "timeframes": ["15m", "1h"], "active": true}'),
('Quantum Scalper Elite', 88.2, 'HIGH', 1234, 0.71, 189.3, -18.7, 1.9, '{"strategy": "scalping", "timeframes": ["5m", "15m"], "active": true}'),
('Diamond Hands DCA', 92.4, 'LOW', 456, 0.82, 167.9, -8.1, 2.8, '{"strategy": "dca", "timeframes": ["1h", "4h"], "active": true}'),
('Lightning Arbitrage', 87.6, 'MEDIUM', 2341, 0.69, 134.2, -15.4, 1.7, '{"strategy": "arbitrage", "timeframes": ["1m", "5m"], "active": true}'),
('Zen Master Swing', 91.8, 'LOW', 234, 0.79, 198.7, -9.8, 2.6, '{"strategy": "swing", "timeframes": ["4h", "1d"], "active": true}')
ON CONFLICT DO NOTHING;

-- Insert sample signals using the existing structure
INSERT INTO public.signals (exchange, symbol, timeframe, direction, bar_time, price, score, atr, sl, tp, filters, indicators) VALUES
('bybit', 'BTCUSDT', '1h', 'LONG', NOW() - INTERVAL '1 hour', 43250.50, 89.5, 450.2, 42800.0, 44200.0, '{"volume": true, "trend": true}', '{"rsi": 65.2, "macd": 0.045, "bb_position": 0.7}'),
('bybit', 'ETHUSDT', '15m', 'SHORT', NOW() - INTERVAL '30 minutes', 2345.75, 82.3, 28.9, 2380.0, 2310.0, '{"volume": true, "momentum": true}', '{"rsi": 72.1, "macd": -0.012, "bb_position": 0.9}'),
('bybit', 'SOLUSDT', '1h', 'LONG', NOW() - INTERVAL '45 minutes', 98.45, 91.2, 3.2, 95.20, 102.50, '{"breakout": true, "volume": true}', '{"rsi": 58.9, "macd": 0.087, "bb_position": 0.6}'),
('bybit', 'ADAUSDT', '30m', 'LONG', NOW() - INTERVAL '20 minutes', 0.4567, 85.7, 0.012, 0.4450, 0.4720, '{"support": true, "trend": true}', '{"rsi": 48.3, "macd": 0.003, "bb_position": 0.4}'),
('bybit', 'DOTUSDT', '1h', 'SHORT', NOW() - INTERVAL '10 minutes', 6.789, 78.9, 0.234, 7.050, 6.450, '{"resistance": true, "volume": true}', '{"rsi": 69.8, "macd": -0.034, "bb_position": 0.8}')
ON CONFLICT DO NOTHING;

-- Insert sample quantum analysis using the correct existing structure
INSERT INTO public.quantum_analysis (symbol, quantum_confidence, quantum_probability, price_target, risk_assessment, analysis_data) VALUES
('BTCUSDT', 94.2, 0.78, 44200.0, 'MEDIUM', '{"bull": 0.78, "bear": 0.22, "elliott": "wave_3", "fibonacci": 0.618, "support": 42800, "momentum": "strong", "divergence": false}'),
('ETHUSDT', 87.6, 0.65, 2410.0, 'HIGH', '{"bull": 0.65, "bear": 0.35, "pattern": "ascending_triangle", "breakout": 0.75, "momentum": "medium", "divergence": true}'),
('SOLUSDT', 91.8, 0.82, 102.5, 'LOW', '{"bull": 0.82, "bear": 0.18, "trend": "uptrend", "strength": 0.89, "momentum": "very_strong", "divergence": false}')
ON CONFLICT DO NOTHING;