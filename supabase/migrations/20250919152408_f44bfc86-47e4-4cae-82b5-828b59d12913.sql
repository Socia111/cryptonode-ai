-- Fix critical permission and RLS policy issues
-- This migration addresses the core database access problems

-- 1. First, ensure proper RLS policies for execution_orders table
DROP POLICY IF EXISTS "Service role can manage execution orders" ON execution_orders;
DROP POLICY IF EXISTS "Users can read own execution orders" ON execution_orders;
DROP POLICY IF EXISTS "execution_orders_read_own" ON execution_orders;
DROP POLICY IF EXISTS "execution_orders_service_manage" ON execution_orders;

-- Create proper RLS policies for execution_orders
CREATE POLICY "Users can view their own execution orders" 
ON execution_orders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own execution orders" 
ON execution_orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to execution orders" 
ON execution_orders FOR ALL 
USING (auth.role() = 'service_role');

-- 2. Fix user_trading_accounts policies
DROP POLICY IF EXISTS "Users can manage their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Service role can manage all trading accounts" ON user_trading_accounts;

CREATE POLICY "Users can view their own trading accounts" 
ON user_trading_accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading accounts" 
ON user_trading_accounts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading accounts" 
ON user_trading_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to trading accounts" 
ON user_trading_accounts FOR ALL 
USING (auth.role() = 'service_role');

-- 3. Fix live_market_data access
DROP POLICY IF EXISTS "Public read access to live market data" ON live_market_data;

CREATE POLICY "Authenticated users can read live market data" 
ON live_market_data FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage live market data" 
ON live_market_data FOR ALL 
USING (auth.role() = 'service_role');

-- 4. Fix exchange_feed_status access
DROP POLICY IF EXISTS "Public read access to exchange feed status" ON exchange_feed_status;

CREATE POLICY "Authenticated users can read exchange feed status" 
ON exchange_feed_status FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage exchange feed status" 
ON exchange_feed_status FOR ALL 
USING (auth.role() = 'service_role');

-- 5. Fix signals table policies
DROP POLICY IF EXISTS "Public read access to signals" ON signals;
DROP POLICY IF EXISTS "Authenticated users can read signals" ON signals;

CREATE POLICY "Authenticated users can read signals" 
ON signals FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage signals" 
ON signals FOR ALL 
USING (auth.role() = 'service_role');

-- 6. Ensure RLS is enabled on all tables
ALTER TABLE execution_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_feed_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

-- 7. Grant necessary permissions to authenticated role
GRANT SELECT ON execution_orders TO authenticated;
GRANT INSERT ON execution_orders TO authenticated;
GRANT SELECT ON user_trading_accounts TO authenticated;
GRANT INSERT, UPDATE ON user_trading_accounts TO authenticated;
GRANT SELECT ON live_market_data TO authenticated;
GRANT SELECT ON exchange_feed_status TO authenticated;
GRANT SELECT ON signals TO authenticated;

-- 8. Grant full permissions to service_role
GRANT ALL ON execution_orders TO service_role;
GRANT ALL ON user_trading_accounts TO service_role;
GRANT ALL ON live_market_data TO service_role;
GRANT ALL ON exchange_feed_status TO service_role;
GRANT ALL ON signals TO service_role;

-- 9. Fix function search paths for security
DROP FUNCTION IF EXISTS public.restore_user_trading_account(uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.restore_user_trading_account(p_user_id uuid, p_api_key text, p_api_secret text, p_account_type text DEFAULT 'testnet'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  account_id UUID;
  existing_account_id UUID;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_api_key IS NULL OR length(p_api_key) < 5 THEN
    RAISE EXCEPTION 'API key is invalid or too short';
  END IF;
  
  IF p_api_secret IS NULL OR length(p_api_secret) < 5 THEN
    RAISE EXCEPTION 'API secret is invalid or too short';
  END IF;

  -- Check for existing account first (including inactive ones)
  SELECT id INTO existing_account_id
  FROM user_trading_accounts 
  WHERE user_id = p_user_id 
    AND exchange = 'bybit' 
    AND account_type = p_account_type
  LIMIT 1;
  
  -- If account exists, update it and return the ID
  IF existing_account_id IS NOT NULL THEN
    UPDATE user_trading_accounts 
    SET 
      api_key_encrypted = p_api_key,
      api_secret_encrypted = p_api_secret,
      is_active = true,
      updated_at = now(),
      last_used_at = now()
    WHERE id = existing_account_id;
    
    RETURN existing_account_id;
  END IF;
  
  -- Create new account if none exists
  INSERT INTO user_trading_accounts (
    user_id,
    exchange,
    account_type,
    api_key_encrypted,
    api_secret_encrypted,
    is_active,
    permissions,
    connected_at,
    last_used_at
  ) VALUES (
    p_user_id,
    'bybit',
    p_account_type,
    p_api_key,
    p_api_secret,
    true,
    ARRAY['read', 'trade'],
    now(),
    now()
  ) RETURNING id INTO account_id;
  
  RETURN account_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to restore trading account: %', SQLERRM;
END;
$function$;