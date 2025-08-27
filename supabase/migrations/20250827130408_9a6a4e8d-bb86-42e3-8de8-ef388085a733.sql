-- Invoke scanner engine to generate fresh signals
SELECT 'Starting fresh signal generation' as status;

-- Check telegram notifications 
SELECT COUNT(*) as telegram_alerts_sent, MAX(sent_at) as last_alert 
FROM telegram_notifications 
WHERE sent_at > now() - interval '24 hours';