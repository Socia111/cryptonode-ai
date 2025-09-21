-- Disable the remaining 15m signal generator
SELECT cron.unschedule('comprehensive-signal-scan');

-- Clean up the signals that just came in
DELETE FROM signals WHERE timeframe = '15m' AND created_at > NOW() - INTERVAL '30 minutes';