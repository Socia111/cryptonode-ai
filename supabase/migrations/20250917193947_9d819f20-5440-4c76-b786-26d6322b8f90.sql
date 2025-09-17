-- Fix RLS policies and database schema issues

-- 1. Fix signals table schema (missing exchange column)
ALTER TABLE signals ADD COLUMN IF NOT EXISTS exchange text DEFAULT 'bybit';

-- 2. Update RLS policies to allow service role access for all operations
DROP POLICY IF EXISTS "Service role can manage all signals" ON signals;
CREATE POLICY "Service role can manage all signals" ON signals
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 3. Fix user_trading_accounts RLS policies 
DROP POLICY IF EXISTS "Service role can manage user accounts" ON user_trading_accounts;
CREATE POLICY "Service role can manage user accounts" ON user_trading_accounts
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 4. Fix markets table RLS policies
DROP POLICY IF EXISTS "Service role can manage markets" ON markets;
CREATE POLICY "Service role can manage markets" ON markets
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 5. Ensure the restore function has proper permissions
GRANT EXECUTE ON FUNCTION restore_user_trading_account TO service_role;
GRANT EXECUTE ON FUNCTION restore_user_trading_account TO authenticated;

-- 6. Update the restore function to be more robust
CREATE OR REPLACE FUNCTION restore_user_trading_account(
  p_user_id UUID,
  p_api_key TEXT,
  p_api_secret TEXT,
  p_account_type TEXT DEFAULT 'testnet'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_id UUID;
BEGIN
  -- Delete any existing accounts for this user to avoid duplicates
  DELETE FROM user_trading_accounts 
  WHERE user_id = p_user_id AND exchange = 'bybit';
  
  -- Insert the new account
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
END;
$$;