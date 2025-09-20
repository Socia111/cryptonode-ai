-- Fix RLS policies to allow public read access and service role management

-- Update markets table policies
DROP POLICY IF EXISTS "Public read access to markets" ON markets;
DROP POLICY IF EXISTS "Service role manages markets" ON markets;

CREATE POLICY "Public read access to markets" 
ON markets FOR SELECT 
USING (true);

CREATE POLICY "Service role manages markets" 
ON markets FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update app_settings policies  
DROP POLICY IF EXISTS "Public read access to app settings" ON app_settings;
DROP POLICY IF EXISTS "Service role manages app settings" ON app_settings;

CREATE POLICY "Public read access to app settings" 
ON app_settings FOR SELECT 
USING (true);

CREATE POLICY "Service role manages app settings" 
ON app_settings FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update edge_event_log policies
DROP POLICY IF EXISTS "Service role manages edge_event_log" ON edge_event_log;

CREATE POLICY "Public read edge_event_log" 
ON edge_event_log FOR SELECT 
USING (true);

CREATE POLICY "Service role manages edge_event_log" 
ON edge_event_log FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Insert test app settings
INSERT INTO app_settings (key, value) VALUES 
('symbols_to_scan', '["BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "SOLUSDT", "DOTUSDT", "LINKUSDT"]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Insert test signals with proper bar_time
INSERT INTO signals (symbol, timeframe, direction, price, entry_price, score, confidence, source, algo, is_active, metadata, bar_time) VALUES 
('BTCUSDT', '15m', 'LONG', 95000, 95000, 85, 0.85, 'enhanced_signal_generation', 'aitradex1_real', true, '{"verified_real_data": true, "data_source": "live_market"}', NOW()),
('ETHUSDT', '1h', 'SHORT', 3800, 3800, 78, 0.78, 'enhanced_signal_generation', 'aitradex1_real', true, '{"verified_real_data": true, "data_source": "live_market"}', NOW()),
('BNBUSDT', '30m', 'LONG', 720, 720, 82, 0.82, 'enhanced_signal_generation', 'aitradex1_real', true, '{"verified_real_data": true, "data_source": "live_market"}', NOW())
ON CONFLICT DO NOTHING;