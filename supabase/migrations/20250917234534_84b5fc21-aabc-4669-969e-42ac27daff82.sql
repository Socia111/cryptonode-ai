-- Phase 1: Fix database access and authentication

-- Update the restore_user_trading_account function to handle edge function context better
CREATE OR REPLACE FUNCTION public.restore_user_trading_account(
  p_user_id uuid, 
  p_api_key text, 
  p_api_secret text, 
  p_account_type text DEFAULT 'testnet'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Add a helper function to get user trading account for edge functions
CREATE OR REPLACE FUNCTION public.get_user_trading_account(p_user_id uuid, p_account_type text DEFAULT 'testnet')
RETURNS TABLE(
  id uuid,
  api_key_encrypted text,
  api_secret_encrypted text,
  is_active boolean,
  account_type text,
  permissions text[],
  risk_settings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    uta.id,
    uta.api_key_encrypted,
    uta.api_secret_encrypted,
    uta.is_active,
    uta.account_type,
    uta.permissions,
    uta.risk_settings
  FROM user_trading_accounts uta
  WHERE uta.user_id = p_user_id 
    AND uta.exchange = 'bybit'
    AND uta.account_type = p_account_type
    AND uta.is_active = true
  ORDER BY uta.created_at DESC
  LIMIT 1;
END;
$function$;

-- Update RLS policies to ensure service role has proper access
DROP POLICY IF EXISTS "Service role full access to trading accounts" ON public.user_trading_accounts;

CREATE POLICY "Service role and edge functions can access trading accounts"
ON public.user_trading_accounts
FOR ALL
USING (
  auth.role() = 'service_role'::text 
  OR auth.uid() = user_id
)
WITH CHECK (
  auth.role() = 'service_role'::text 
  OR auth.uid() = user_id
);

-- Ensure audit_log can be accessed by service role for logging
CREATE POLICY "Service role can manage audit logs for edge functions"
ON public.audit_log
FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);