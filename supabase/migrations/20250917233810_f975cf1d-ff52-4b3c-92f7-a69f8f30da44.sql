-- Phase 1: Fix remaining Database and RLS Issues (skip signals realtime since it's already configured)

-- 1. Enable realtime for signals table (just enable REPLICA IDENTITY FULL)
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- 2. Ensure markets table has proper public access (recreate with correct policy)
DROP POLICY IF EXISTS "Public read access to markets" ON public.markets;
CREATE POLICY "Public read access to markets" 
ON public.markets 
FOR SELECT 
TO anon, authenticated
USING (true);

-- 3. Improve user_trading_accounts RLS for edge functions
DROP POLICY IF EXISTS "Service role can manage trading accounts" ON public.user_trading_accounts;
CREATE POLICY "Service role can manage trading accounts" 
ON public.user_trading_accounts 
FOR ALL 
USING (
  -- Allow service role OR users accessing their own accounts
  auth.role() = 'service_role'::text OR auth.uid() = user_id
)
WITH CHECK (
  auth.role() = 'service_role'::text OR auth.uid() = user_id
);

-- 4. Ensure audit_log has proper access for trade logging
DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.audit_log;
CREATE POLICY "Service role can manage audit logs" 
ON public.audit_log 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);