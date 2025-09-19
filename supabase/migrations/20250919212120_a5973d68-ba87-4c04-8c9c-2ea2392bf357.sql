-- Clean up any failed trade logs and test system
DELETE FROM execution_orders 
WHERE status = 'failed' 
AND created_at < NOW() - INTERVAL '1 hour';

-- Update system status
INSERT INTO exchange_feed_status (exchange, status, last_update, symbols_tracked, error_count)
VALUES ('system_test', 'active', NOW(), 6, 0)
ON CONFLICT (exchange) 
DO UPDATE SET 
  status = 'active',
  last_update = NOW(),
  error_count = 0;