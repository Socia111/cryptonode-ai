-- Step 3.1: Enable RLS policies for user_trading_accounts
-- Enable RLS if not already enabled
ALTER TABLE public.user_trading_accounts ENABLE ROW LEVEL SECURITY;

-- Users can see their own records
CREATE POLICY "uta_select_own"
ON public.user_trading_accounts
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own record
CREATE POLICY "uta_insert_own"
ON public.user_trading_accounts
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own record
CREATE POLICY "uta_update_own"
ON public.user_trading_accounts
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);