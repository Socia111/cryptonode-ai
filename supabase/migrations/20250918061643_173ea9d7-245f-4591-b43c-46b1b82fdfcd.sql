-- Fix RLS policies for execution_orders table to properly handle authenticated users
DROP POLICY IF EXISTS orders_owner_select ON public.execution_orders;
DROP POLICY IF EXISTS orders_owner_insert ON public.execution_orders;
DROP POLICY IF EXISTS orders_service_manage ON public.execution_orders;

-- Create proper RLS policies for execution_orders
CREATE POLICY "Users can view their own orders" 
ON public.execution_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.execution_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" 
ON public.execution_orders 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all orders" 
ON public.execution_orders 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Fix search_path for security on database functions
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
  
  -- Return the account ID
  RETURN account_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise with context
    RAISE EXCEPTION 'Failed to restore trading account: %', SQLERRM;
END;
$function$;