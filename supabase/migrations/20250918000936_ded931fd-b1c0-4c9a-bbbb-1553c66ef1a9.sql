-- Fix RLS policies for markets table (allow public read access)
DROP POLICY IF EXISTS "Markets are publicly readable" ON public.markets;
CREATE POLICY "Markets are publicly readable" ON public.markets
  FOR SELECT USING (true);

-- Ensure RLS is enabled on markets table
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Fix user_trading_accounts policies to allow proper user access
DROP POLICY IF EXISTS "Users can view their own trading accounts" ON public.user_trading_accounts;
CREATE POLICY "Users can view their own trading accounts" ON public.user_trading_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own trading accounts" ON public.user_trading_accounts;
CREATE POLICY "Users can insert their own trading accounts" ON public.user_trading_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trading accounts" ON public.user_trading_accounts;
CREATE POLICY "Users can update their own trading accounts" ON public.user_trading_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Ensure RLS is enabled on user_trading_accounts
ALTER TABLE public.user_trading_accounts ENABLE ROW LEVEL SECURITY;

-- Fix signals table to allow public read access
DROP POLICY IF EXISTS "Signals are publicly readable" ON public.signals;
CREATE POLICY "Signals are publicly readable" ON public.signals
  FOR SELECT USING (true);

-- Ensure RLS is enabled on signals table
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;