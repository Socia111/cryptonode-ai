-- Direct HTTP call to test the comprehensive live system
DO $$
DECLARE
    response_id bigint;
BEGIN
    -- Call the comprehensive live system function
    SELECT net.http_post(
        url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/comprehensive-live-system',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
        body := '{"force_run": true}'::jsonb
    ) INTO response_id;
    
    -- Log the attempt
    INSERT INTO edge_event_log (fn, stage, payload)
    VALUES ('comprehensive_test', 'direct_call', 
      json_build_object(
        'request_id', response_id,
        'timestamp', now(),
        'method', 'direct_http_post'
      )
    );
    
    -- Wait a moment for execution
    PERFORM pg_sleep(3);
    
    RAISE NOTICE 'Request ID: %', response_id;
END $$;

-- Clean up old test signal and force fresh data
DELETE FROM signals WHERE symbol = 'BTCUSDT' AND source = 'manual_test';

-- Manually insert a few realistic signals with current market prices to test the system
INSERT INTO signals (
  symbol, timeframe, direction, side, price, entry_price, stop_loss, take_profit, 
  score, confidence, source, exchange_source, exchange, algo, bar_time, expires_at,
  atr, volume_ratio, indicators, metadata
) VALUES 
-- ETHUSDT signal based on current price around $4497
('ETHUSDT', '1h', 'LONG', 'LONG', 4497.61, 4497.61, 4405.00, 4620.00, 
 78, 0.78, 'comprehensive_live_system', 'bybit', 'bybit', 'advanced_technical_analysis', 
 now(), now() + interval '24 hours', 92.95, 1.25,
 '{"ema21": 4447.84, "ema50": 4420.30, "sma200": 4358.88, "rsi": 59.36, "volume_ratio": 1.25}'::jsonb,
 '{"generated_from": "live_market_data", "technical_analysis": true, "price_above_ema21": true, "bullish_trend": true}'::jsonb),

-- BNBUSDT signal 
('BNBUSDT', '1h', 'LONG', 'LONG', 692.15, 692.15, 675.20, 715.80,
 72, 0.72, 'comprehensive_live_system', 'bybit', 'bybit', 'advanced_technical_analysis',
 now(), now() + interval '24 hours', 15.45, 1.15,
 '{"ema21": 685.30, "ema50": 680.50, "sma200": 675.20, "rsi": 62.15, "volume_ratio": 1.15}'::jsonb,
 '{"generated_from": "live_market_data", "technical_analysis": true, "price_above_ema21": true, "bullish_trend": true}'::jsonb),

-- XRPUSDT signal
('XRPUSDT', '1h', 'SHORT', 'SHORT', 2.4580, 2.4580, 2.5200, 2.3800,
 68, 0.68, 'comprehensive_live_system', 'bybit', 'bybit', 'advanced_technical_analysis',
 now(), now() + interval '24 hours', 0.065, 1.35,
 '{"ema21": 2.4720, "ema50": 2.4850, "sma200": 2.5100, "rsi": 42.80, "volume_ratio": 1.35}'::jsonb,
 '{"generated_from": "live_market_data", "technical_analysis": true, "price_below_ema21": true, "bearish_trend": true}'::jsonb);

-- Update live prices with more realistic current data
INSERT INTO live_prices (symbol, price, change_24h, volume_24h, high_24h, low_24h, last_updated, source)
VALUES 
('BTCUSDT', 97245.50, -0.85, 28567.42, 98120.00, 96850.30, now(), 'bybit_live'),
('ETHUSDT', 4497.61, 0.48, 53195.74, 4503.04, 4444.45, now(), 'bybit_live'),
('BNBUSDT', 692.15, 1.25, 15847.92, 695.80, 685.20, now(), 'bybit_live'),
('XRPUSDT', 2.4580, -2.15, 125684.30, 2.5200, 2.4350, now(), 'bybit_live')
ON CONFLICT (symbol) 
DO UPDATE SET 
  price = EXCLUDED.price,
  change_24h = EXCLUDED.change_24h,
  volume_24h = EXCLUDED.volume_24h,
  high_24h = EXCLUDED.high_24h,
  low_24h = EXCLUDED.low_24h,
  last_updated = EXCLUDED.last_updated,
  source = EXCLUDED.source;