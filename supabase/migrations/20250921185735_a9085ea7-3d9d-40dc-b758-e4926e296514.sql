-- Disable the cron jobs that are generating 15m signals
SELECT cron.unschedule('aitradex1-15m-canonical');
SELECT cron.unschedule('automated-signal-generation'); 
SELECT cron.unschedule('signal-generation');
SELECT cron.unschedule('aitradex1-5m-canonical');

-- Keep only the 1h job for now
-- Job 9: aitradex1-1h-canonical already exists and runs hourly

-- Clean up recent 15m signals
DELETE FROM signals WHERE timeframe IN ('15m', '5m') AND created_at > NOW() - INTERVAL '3 hours';