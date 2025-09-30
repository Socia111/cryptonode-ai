-- September 11th Database Reversion Script - Part 1: Data Cleanup
-- WARNING: This will delete all data created after September 11, 2024, 11:12 AM

-- Clean up data tables (remove entries after Sept 11, 2024 11:12 AM)
DELETE FROM public.signals WHERE created_at > '2024-09-11 11:12:00+00';
DELETE FROM public.execution_orders WHERE created_at > '2024-09-11 11:12:00+00';
DELETE FROM public.execution_queue WHERE created_at > '2024-09-11 11:12:00+00';
DELETE FROM public.edge_event_log WHERE created_at > '2024-09-11 11:12:00+00';
DELETE FROM public.trading_executions WHERE executed_at > '2024-09-11 11:12:00+00';
DELETE FROM public.trade_logs WHERE created_at > '2024-09-11 11:12:00+00';
DELETE FROM public.trading_stats WHERE created_at > '2024-09-11 11:12:00+00';

-- Reset trading configurations
DELETE FROM public.automated_trading_config WHERE created_at > '2024-09-11 11:12:00+00';
DELETE FROM public.trading_configs WHERE created_at > '2024-09-11 11:12:00+00';

-- Clean system status and logs
DELETE FROM public.system_status WHERE last_update > '2024-09-11 11:12:00+00';
DELETE FROM public.exchange_feed_status WHERE last_update > '2024-09-11 11:12:00+00';

-- Reset market data
DELETE FROM public.live_market_data WHERE created_at > '2024-09-11 11:12:00+00';
DELETE FROM public.live_prices WHERE created_at > '2024-09-11 11:12:00+00';

-- Drop recent triggers first
DROP TRIGGER IF EXISTS trigger_automated_trading ON public.signals;
DROP TRIGGER IF EXISTS prevent_mock_signals_trigger ON public.signals;
DROP TRIGGER IF EXISTS validate_signal_price_trigger ON public.signals;
DROP TRIGGER IF EXISTS enforce_signal_cooldown_trigger ON public.signals;
DROP TRIGGER IF EXISTS enforce_flexible_signal_cooldown_trigger ON public.signals;
DROP TRIGGER IF EXISTS trig_signals_default_grade_trigger ON public.signals;

-- Drop recent database functions (likely added after Sept 11)
DROP FUNCTION IF EXISTS public.cleanup_old_signals() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_automated_trading() CASCADE;
DROP FUNCTION IF EXISTS public.claim_execution_jobs(integer) CASCADE;
DROP FUNCTION IF EXISTS public.complete_execution_job(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fail_execution_job(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.enforce_flexible_signal_cooldown() CASCADE;
DROP FUNCTION IF EXISTS public.increment_credit_usage(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_crypto_scheduler() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_trading_account(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.restore_user_trading_account(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.prevent_mock_signals() CASCADE;
DROP FUNCTION IF EXISTS public.validate_signal_price() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_signal_cooldown() CASCADE;
DROP FUNCTION IF EXISTS public.get_symbols_for_scanning() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_real_system() CASCADE;
DROP FUNCTION IF EXISTS public.safe_edge_log_insert(text, text, jsonb) CASCADE;

-- Log the cleanup
INSERT INTO public.edge_event_log (fn, stage, payload)
VALUES ('database_cleanup', 'september_11_reversion_completed', jsonb_build_object(
  'timestamp', now(),
  'reversion_date', '2024-09-11 11:12:00+00',
  'cleanup_completed', true
));