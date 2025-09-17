-- Fix 1: Add missing filters column to signals table for edge functions
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS filters jsonb DEFAULT '{}';

-- Fix 2: Add missing columns that edge functions expect
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS side text;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS signal_type text;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Fix 3: Update RLS policies for markets table to allow read access
DROP POLICY IF EXISTS "Authenticated users can view active markets" ON public.markets;
CREATE POLICY "Anyone can view active markets" ON public.markets
FOR SELECT USING (status = 'active');

-- Fix 4: Create comprehensive RLS policy for user_trading_accounts
DROP POLICY IF EXISTS "Service role can manage all trading accounts" ON public.user_trading_accounts;
DROP POLICY IF EXISTS "Users can view their own trading accounts" ON public.user_trading_accounts;
DROP POLICY IF EXISTS "Users can insert their own trading accounts" ON public.user_trading_accounts;
DROP POLICY IF EXISTS "Users can update their own trading accounts" ON public.user_trading_accounts;
DROP POLICY IF EXISTS "Users can delete their own trading accounts" ON public.user_trading_accounts;

-- Create new comprehensive policies
CREATE POLICY "Service role full access to trading accounts" ON public.user_trading_accounts
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users full access to own trading accounts" ON public.user_trading_accounts
FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Fix 5: Update restore_user_trading_account function to handle edge cases better
CREATE OR REPLACE FUNCTION public.restore_user_trading_account(
  p_user_id uuid, 
  p_api_key text, 
  p_api_secret text, 
  p_account_type text DEFAULT 'testnet'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_id UUID;
  existing_account_id UUID;
BEGIN
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
    
    -- Return the updated account ID
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
  
  -- Always return the account ID
  RETURN account_id;
END;
$$;