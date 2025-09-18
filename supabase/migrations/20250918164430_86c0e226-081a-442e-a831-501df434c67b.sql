-- Clean up old signals to make room for comprehensive scan results
DELETE FROM signals WHERE created_at < NOW() - INTERVAL '2 hours' AND score < 80;

-- Update exchange feed status for comprehensive scanning
INSERT INTO exchange_feed_status (exchange, status, last_update, symbols_tracked, error_count)
VALUES 
  ('comprehensive_scanner', 'active', NOW(), 2000, 0)
ON CONFLICT (exchange) 
DO UPDATE SET 
  status = 'active',
  last_update = NOW(),
  symbols_tracked = 2000,
  error_count = 0;