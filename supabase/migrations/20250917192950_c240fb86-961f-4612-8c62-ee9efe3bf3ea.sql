-- Check current user_trading_accounts table and fix the account creation process
-- First, create a proper function to restore trading accounts for the rebuild process

-- Create or replace function to restore user trading account with proper API credentials
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

-- Update RLS policies to allow the function to work properly
DROP POLICY IF EXISTS "Service role can manage user accounts" ON user_trading_accounts;
CREATE POLICY "Service role can manage user accounts" ON user_trading_accounts
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');