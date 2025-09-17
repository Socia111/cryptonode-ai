-- Phase 1: Fix Database and RLS Issues

-- 1. Enable realtime for signals table
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- 2. Add signals table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- 3. Ensure markets table has proper public access
DROP POLICY IF EXISTS "Public read access to markets" ON public.markets;
CREATE POLICY "Public read access to markets" 
ON public.markets 
FOR SELECT 
USING (true);

-- 4. Improve user_trading_accounts RLS for edge functions
DROP POLICY IF EXISTS "Service role full access to trading accounts" ON public.user_trading_accounts;
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

-- 5. Ensure audit_log has proper access for trade logging
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_log;
CREATE POLICY "Service role can manage audit logs" 
ON public.audit_log 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);