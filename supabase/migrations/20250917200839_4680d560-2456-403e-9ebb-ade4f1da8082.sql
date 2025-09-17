-- Fix RLS policies for user_trading_accounts table
-- First, check current policies and fix them

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can manage their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Users can delete their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Service role can manage user accounts" ON user_trading_accounts;

-- Create proper RLS policies
CREATE POLICY "Users can view their own trading accounts" 
ON user_trading_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading accounts" 
ON user_trading_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading accounts" 
ON user_trading_accounts 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading accounts" 
ON user_trading_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role policy for edge functions
CREATE POLICY "Service role can manage all trading accounts" 
ON user_trading_accounts 
FOR ALL 
USING (auth.role() = 'service_role');

-- Update the restore function to work better with RLS
CREATE OR REPLACE FUNCTION public.restore_user_trading_account(
  p_user_id uuid, 
  p_api_key text, 
  p_api_secret text, 
  p_account_type text DEFAULT 'testnet'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  account_id UUID;
  existing_account_id UUID;
BEGIN
  -- Check for existing account first
  SELECT id INTO existing_account_id
  FROM user_trading_accounts 
  WHERE user_id = p_user_id 
    AND exchange = 'bybit' 
    AND account_type = p_account_type
  LIMIT 1;
  
  -- If account exists, update it
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
  
  -- Otherwise create new account
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
$function$;