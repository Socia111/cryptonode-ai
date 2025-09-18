-- Fix RLS policies for user_trading_accounts
ALTER TABLE user_trading_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow users to view their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Allow users to insert their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Allow users to update their own trading accounts" ON user_trading_accounts;
DROP POLICY IF EXISTS "Allow service role full access to user_trading_accounts" ON user_trading_accounts;

-- Create comprehensive policies for user_trading_accounts
CREATE POLICY "user_trading_accounts_select_policy" ON user_trading_accounts
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "user_trading_accounts_insert_policy" ON user_trading_accounts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "user_trading_accounts_update_policy" ON user_trading_accounts
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Create policy to allow anonymous read access for signals table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON signals;
DROP POLICY IF EXISTS "Enable read access for everyone" ON signals;

CREATE POLICY "signals_read_policy" ON signals
  FOR SELECT USING (true); -- Allow everyone to read signals

-- Enable insert for authenticated users and service role
CREATE POLICY "signals_insert_policy" ON signals
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );