-- Fix markets table RLS policy for authenticated users
DROP POLICY IF EXISTS "Anyone can view active markets" ON public.markets;

CREATE POLICY "Authenticated users can view active markets" 
ON public.markets 
FOR SELECT 
TO authenticated 
USING (status = 'active');

-- Allow anonymous users to view signals (required for public access)
DROP POLICY IF EXISTS "Allow anonymous read access to active signals" ON public.signals;

CREATE POLICY "Allow anonymous and authenticated read access to active signals" 
ON public.signals 
FOR SELECT 
TO anon, authenticated
USING (((expires_at IS NULL) OR (expires_at > now())) AND (created_at > (now() - '7 days'::interval)));

-- Update user_trading_accounts policy to ensure proper access
DROP POLICY IF EXISTS "Users can view their own trading accounts" ON public.user_trading_accounts;
DROP POLICY IF EXISTS "Users can insert their own trading accounts" ON public.user_trading_accounts;
DROP POLICY IF EXISTS "Users can update their own trading accounts" ON public.user_trading_accounts;

CREATE POLICY "Users can manage their own trading accounts" 
ON public.user_trading_accounts 
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);