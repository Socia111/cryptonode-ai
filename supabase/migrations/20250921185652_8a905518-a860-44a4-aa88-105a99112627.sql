-- Get current cron jobs with IDs to disable the right ones
SELECT cron.unschedule(19); -- live-scanner-15m 
SELECT cron.unschedule(18); -- live-scanner-continuous 
SELECT cron.unschedule(6);  -- aitradex1-1m-discovery

-- Clean up old signals that just came in
DELETE FROM signals WHERE timeframe = '15m' AND created_at > NOW() - INTERVAL '1 hour';