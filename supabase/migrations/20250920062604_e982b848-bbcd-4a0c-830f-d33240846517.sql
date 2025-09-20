-- Ensure automated trading is properly enabled and configured
INSERT INTO app_settings (key, value, updated_at) 
VALUES 
    ('automated_trading_enabled', 'true', now()),
    ('live_trading_enabled', 'true', now()),
    ('scheduler_interval_minutes', '15', now()),
    ('min_signal_score', '60', now())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

-- Update system status to reflect current operational state
UPDATE system_status 
SET 
    status = 'active',
    last_update = now(),
    metadata = jsonb_build_object(
        'cron_enabled', true,
        'interval_minutes', 15,
        'signal_generation_active', true,
        'trading_execution_ready', true
    )
WHERE service_name = 'crypto_scheduler';

-- Ensure all required system status entries exist
INSERT INTO system_status (service_name, status, last_update, metadata)
VALUES 
    ('signal_generation', 'active', now(), '{"min_score": 60, "engines": ["enhanced", "scanner"]}'),
    ('trade_execution', 'active', now(), '{"position_mode_fix": true, "retry_logic": true}'),
    ('automated_trading', 'active', now(), '{"enabled": true, "live_trading": true}')
ON CONFLICT (service_name) DO UPDATE SET
    status = 'active',
    last_update = now(),
    metadata = EXCLUDED.metadata;