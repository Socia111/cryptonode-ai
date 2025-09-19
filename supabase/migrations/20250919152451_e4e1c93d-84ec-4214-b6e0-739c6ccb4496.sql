-- Drop all existing conflicting policies first
DO $$
BEGIN
    -- Drop execution_orders policies
    DROP POLICY IF EXISTS "Service role can manage execution orders" ON execution_orders;
    DROP POLICY IF EXISTS "Users can read own execution orders" ON execution_orders;
    DROP POLICY IF EXISTS "execution_orders_read_own" ON execution_orders;
    DROP POLICY IF EXISTS "execution_orders_service_manage" ON execution_orders;
    DROP POLICY IF EXISTS "Users can view their own execution orders" ON execution_orders;
    DROP POLICY IF EXISTS "Users can insert their own execution orders" ON execution_orders;
    DROP POLICY IF EXISTS "Service role full access to execution orders" ON execution_orders;

    -- Drop user_trading_accounts policies
    DROP POLICY IF EXISTS "Users can manage their own trading accounts" ON user_trading_accounts;
    DROP POLICY IF EXISTS "Service role can manage all trading accounts" ON user_trading_accounts;
    DROP POLICY IF EXISTS "Users can view their own trading accounts" ON user_trading_accounts;
    DROP POLICY IF EXISTS "Users can update their own trading accounts" ON user_trading_accounts;
    DROP POLICY IF EXISTS "Users can insert their own trading accounts" ON user_trading_accounts;
    DROP POLICY IF EXISTS "Service role full access to trading accounts" ON user_trading_accounts;

    -- Drop live_market_data policies  
    DROP POLICY IF EXISTS "Public read access to live market data" ON live_market_data;
    DROP POLICY IF EXISTS "Authenticated users can read live market data" ON live_market_data;
    DROP POLICY IF EXISTS "Service role can manage live market data" ON live_market_data;

    -- Drop exchange_feed_status policies
    DROP POLICY IF EXISTS "Public read access to exchange feed status" ON exchange_feed_status;
    DROP POLICY IF EXISTS "Authenticated users can read exchange feed status" ON exchange_feed_status;
    DROP POLICY IF EXISTS "Service role can manage exchange feed status" ON exchange_feed_status;

    -- Drop signals policies
    DROP POLICY IF EXISTS "Public read access to signals" ON signals;
    DROP POLICY IF EXISTS "Authenticated users can read signals" ON signals;
    DROP POLICY IF EXISTS "Service role can manage signals" ON signals;
END
$$;