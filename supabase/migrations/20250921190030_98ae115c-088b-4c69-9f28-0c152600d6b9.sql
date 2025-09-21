-- Disable all remaining signal-generating cron jobs
SELECT cron.unschedule('comprehensive-trading-pipeline');
SELECT cron.unschedule('crypto-scheduler-automation'); 
SELECT cron.unschedule('crypto-scheduler-15min');
SELECT cron.unschedule('generate-live-signals');

-- Clean up any remaining 15m signals
DELETE FROM signals WHERE timeframe IN ('15m', '5m') AND created_at > NOW() - INTERVAL '2 hours';