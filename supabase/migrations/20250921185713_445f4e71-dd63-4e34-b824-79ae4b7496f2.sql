-- Delete the problematic cron jobs directly
DELETE FROM cron.job WHERE jobid IN (6, 18, 19);

-- Clean up the recent 15m signals
DELETE FROM signals WHERE timeframe = '15m' AND created_at > NOW() - INTERVAL '2 hours';