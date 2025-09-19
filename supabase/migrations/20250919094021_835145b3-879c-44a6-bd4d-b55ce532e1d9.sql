-- Fix 1: Add missing indicators column to signals table
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS indicators jsonb DEFAULT '{}';

-- Fix 2: Update RLS policies for better access control
-- Fix user_trading_accounts policy
DROP POLICY IF EXISTS "uta_public_read" ON public.user_trading_accounts;
CREATE POLICY "Users can read own trading accounts" 
ON public.user_trading_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage trading accounts" 
ON public.user_trading_accounts 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Fix execution_orders policy  
DROP POLICY IF EXISTS "exec_orders_public_read" ON public.execution_orders;
CREATE POLICY "Users can read own execution orders" 
ON public.execution_orders 
FOR SELECT 
USING (auth.uid() = user_id OR auth.role() = 'service_role'::text);

CREATE POLICY "Service role can manage execution orders" 
ON public.execution_orders 
FOR ALL 
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Authenticated users can insert execution orders" 
ON public.execution_orders 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR auth.role() = 'service_role'::text);

-- Fix exchange_feed_status policy
DROP POLICY IF EXISTS "xfeed_public_read" ON public.exchange_feed_status;
CREATE POLICY "Public read access to exchange feed status" 
ON public.exchange_feed_status 
FOR SELECT 
USING (true);

-- Fix signals policies for better performance
DROP POLICY IF EXISTS "public-read-live" ON public.signals;
CREATE POLICY "Public read live active signals" 
ON public.signals 
FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_signals_live_active 
ON public.signals (is_active, expires_at, created_at DESC) 
WHERE is_active = true;