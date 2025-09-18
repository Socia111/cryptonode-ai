-- Remove mock data and activate real signal generation
-- First, clear any existing mock/demo data
DELETE FROM signals WHERE source IN ('demo', 'mock', 'ccxt') AND metadata->>'demo' = 'true';
DELETE FROM execution_orders WHERE exchange_order_id LIKE 'USER_%';

-- Update the initialize_demo_system function to not insert mock data
DROP FUNCTION IF EXISTS public.initialize_demo_system();

-- Create real signal initialization function
CREATE OR REPLACE FUNCTION public.initialize_real_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Update system status for real data feeds
  INSERT INTO exchange_feed_status (exchange, status, last_update, symbols_tracked, error_count)
  VALUES 
    ('bybit', 'initializing', now(), 50, 0),
    ('binance', 'initializing', now(), 50, 0)
  ON CONFLICT (exchange) 
  DO UPDATE SET 
    status = 'initializing',
    last_update = now(),
    symbols_tracked = 50,
    error_count = 0;

  result := jsonb_build_object(
    'success', true,
    'mode', 'live_data',
    'feeds_status', 'initializing',
    'timestamp', now()
  );

  RETURN result;
END;
$function$;