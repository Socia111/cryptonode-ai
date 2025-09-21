-- Trigger the unified signal engine to generate actual 1h signals
INSERT INTO edge_event_log (fn, stage, payload)
VALUES ('test_signal_generation', 'trigger_unified_engine', 
  json_build_object(
    'request_type', 'generate_1h_signals',
    'timestamp', now(),
    'manual_trigger', true
  )
);

-- Check if any signals were generated recently
SELECT 
  COUNT(*) as total_signals,
  COUNT(CASE WHEN timeframe = '1h' THEN 1 END) as hour_signals,
  COUNT(CASE WHEN score >= 60 THEN 1 END) as high_confidence_signals,
  MAX(created_at) as latest_signal_time
FROM signals 
WHERE created_at > now() - interval '1 hour';