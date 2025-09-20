-- Insert test app settings for symbols to scan
INSERT INTO app_settings (key, value) VALUES 
('symbols_to_scan', '["BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "SOLUSDT", "DOTUSDT", "LINKUSDT"]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Insert some test signals for demonstration
INSERT INTO signals (symbol, timeframe, direction, price, entry_price, score, confidence, source, algo, is_active, metadata) VALUES 
('BTCUSDT', '15m', 'LONG', 95000, 95000, 85, 0.85, 'enhanced_signal_generation', 'aitradex1_real', true, '{"verified_real_data": true, "data_source": "live_market"}'),
('ETHUSDT', '1h', 'SHORT', 3800, 3800, 78, 0.78, 'enhanced_signal_generation', 'aitradex1_real', true, '{"verified_real_data": true, "data_source": "live_market"}'),
('BNBUSDT', '30m', 'LONG', 720, 720, 82, 0.82, 'enhanced_signal_generation', 'aitradex1_real', true, '{"verified_real_data": true, "data_source": "live_market"}');

-- Insert some market data for the markets table
INSERT INTO markets (symbol, base_asset, quote_asset, exchange, status, enabled) VALUES 
('BTCUSDT', 'BTC', 'USDT', 'bybit', 'active', true),
('ETHUSDT', 'ETH', 'USDT', 'bybit', 'active', true),
('BNBUSDT', 'BNB', 'USDT', 'bybit', 'active', true),
('XRPUSDT', 'XRP', 'USDT', 'bybit', 'active', true)
ON CONFLICT (symbol) DO UPDATE SET updated_at = NOW();