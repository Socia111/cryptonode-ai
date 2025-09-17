-- Enable full replica identity for realtime (if not already set)
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Fix RLS policies for markets table to allow anonymous access
DROP POLICY IF EXISTS "Anyone can view active markets" ON public.markets;
DROP POLICY IF EXISTS "Allow anonymous read access to markets" ON public.markets;
CREATE POLICY "Public read access to markets" 
ON public.markets 
FOR SELECT 
USING (true);

-- Ensure user_trading_accounts has proper RLS for authenticated users  
DROP POLICY IF EXISTS "Users full access to own trading accounts" ON public.user_trading_accounts;
DROP POLICY IF EXISTS "Users can manage own trading accounts" ON public.user_trading_accounts;
CREATE POLICY "Users can access own trading accounts" 
ON public.user_trading_accounts 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);