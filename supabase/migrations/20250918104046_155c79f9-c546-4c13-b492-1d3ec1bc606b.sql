-- Clean up any mock/demo signals and ensure only real market data signals remain
DELETE FROM signals 
WHERE source IN ('demo', 'mock', 'system') 
   OR algo IN ('demo_generator', 'quantum_ai', 'mock_signal_generator')
   OR (metadata IS NULL OR metadata = '{}')
   OR (metadata->>'data_age_minutes' IS NULL AND source NOT IN ('real_market_data', 'live_market_data', 'complete_algorithm_live', 'technical_indicators_real'));

-- Update any existing signals to mark them as real data only
UPDATE signals 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{verified_real_data}', 
  'true'::jsonb
)
WHERE source IN ('real_market_data', 'live_market_data', 'complete_algorithm_live', 'technical_indicators_real');