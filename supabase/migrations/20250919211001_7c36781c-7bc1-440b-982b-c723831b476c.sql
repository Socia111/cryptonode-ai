-- Temporarily disable the signal cooldown trigger to allow new signals
DROP TRIGGER IF EXISTS enforce_signal_cooldown_trigger ON signals;

-- Clear old signals that might be blocking cooldown
DELETE FROM signals WHERE created_at < NOW() - INTERVAL '4 hours';