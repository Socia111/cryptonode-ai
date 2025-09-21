-- Manually trigger the unified-signal-engine to test 1h signal generation
INSERT INTO edge_event_log (fn, stage, payload)
VALUES ('test_1h_signal_generation', 'manual_trigger', 
  json_build_object(
    'timestamp', now(),
    'trigger_reason', 'testing_1h_only_setup',
    'expected_timeframe', '1h'
  )
);