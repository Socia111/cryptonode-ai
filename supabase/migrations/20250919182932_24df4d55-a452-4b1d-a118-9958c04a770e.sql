-- **PHASE 1: SECURITY HARDENING - Fix Overly Permissive RLS Policies**

-- 1. Fix user_trading_accounts - Remove overly permissive "uta_service_all" policy
DROP POLICY IF EXISTS "uta_service_all" ON public.user_trading_accounts;

-- 2. Fix trading_configs - Remove public read access, only authenticated users
DROP POLICY IF EXISTS "Public read access to trading configs" ON public.trading_configs;
CREATE POLICY "Authenticated users can read trading configs" 
ON public.trading_configs 
FOR SELECT 
TO authenticated 
USING (true);

-- 3. Fix app_settings - Remove anonymous access
DROP POLICY IF EXISTS "app_settings_read_authenticated" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_upsert_authenticated" ON public.app_settings;

CREATE POLICY "Authenticated users can read app settings" 
ON public.app_settings 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Service role can manage app settings" 
ON public.app_settings 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 4. Fix audit_log - Remove anonymous read access for trade executions
DROP POLICY IF EXISTS "Allow anonymous read access to trade executions" ON public.audit_log;

-- 5. Fix exchange_feed_status - Remove overly permissive "xfeed_service_all" policy
DROP POLICY IF EXISTS "xfeed_service_all" ON public.exchange_feed_status;

-- **PHASE 2: DATABASE CONSTRAINT FIXES**

-- 6. Fix enhanced-signal-generation function constraint violation
-- Add validation trigger to prevent null price values
CREATE OR REPLACE FUNCTION public.validate_signal_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure price is not null and is positive
  IF NEW.price IS NULL THEN
    RAISE EXCEPTION 'Signal price cannot be null for symbol: %', NEW.symbol;
  END IF;
  
  IF NEW.price <= 0 THEN
    RAISE EXCEPTION 'Signal price must be positive for symbol: %, got: %', NEW.symbol, NEW.price;
  END IF;
  
  -- Ensure entry_price is set if price is set
  IF NEW.entry_price IS NULL THEN
    NEW.entry_price := NEW.price;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to validate signal data before insert
DROP TRIGGER IF EXISTS validate_signal_price_trigger ON public.signals;
CREATE TRIGGER validate_signal_price_trigger
  BEFORE INSERT OR UPDATE ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_signal_price();

-- 7. Update existing null price signals with valid data
UPDATE public.signals 
SET price = COALESCE(entry_price, 1.0)
WHERE price IS NULL;

-- 8. Add indexes for better performance on trading operations
CREATE INDEX IF NOT EXISTS idx_signals_symbol_timeframe_active 
ON public.signals (symbol, timeframe, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_queue_status_created 
ON public.execution_queue (status, created_at);

CREATE INDEX IF NOT EXISTS idx_user_trading_accounts_user_active 
ON public.user_trading_accounts (user_id, is_active, account_type);