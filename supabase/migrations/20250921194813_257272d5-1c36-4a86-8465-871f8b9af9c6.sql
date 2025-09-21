-- Test unified signal engine by manually calling it
INSERT INTO edge_event_log (fn, stage, payload)
VALUES ('unified_signal_test', 'manual_trigger', 
  json_build_object(
    'test_type', 'manual_1h_signal_generation',
    'timestamp', now()
  )
);

-- Also create a test signal for trade execution testing
INSERT INTO signals (
  symbol, direction, price, entry_price, stop_loss, take_profit, score, timeframe, 
  confidence, algo, source, metadata, is_active, expires_at, bar_time
) VALUES (
  'BTCUSDT', 'LONG', 50000, 50000, 49500, 51000, 85, '1h',
  85, 'AItradeX1', 'manual_test',
  '{"test": true, "created_for": "trade_execution_test"}',
  true, now() + interval '4 hours', now()
);