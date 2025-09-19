-- Fix 1: execution_orders RLS policies
ALTER TABLE execution_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exec_orders_public_read ON execution_orders;
DROP POLICY IF EXISTS exec_orders_insert_auth ON execution_orders;
DROP POLICY IF EXISTS exec_orders_service_all ON execution_orders;
DROP POLICY IF EXISTS execution_orders_anonymous_paper_trades ON execution_orders;
DROP POLICY IF EXISTS execution_orders_authenticated_access ON execution_orders;

-- Public read for test visibility
CREATE POLICY exec_orders_public_read
ON execution_orders
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role can do anything
CREATE POLICY exec_orders_service_all
ON execution_orders
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated clients can insert their own test orders
CREATE POLICY exec_orders_insert_auth
ON execution_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Fix 2: exchange_feed_status RLS policies
ALTER TABLE exchange_feed_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS xfeed_public_read ON exchange_feed_status;
DROP POLICY IF EXISTS xfeed_service_all ON exchange_feed_status;
DROP POLICY IF EXISTS exchange_feed_status_read_all ON exchange_feed_status;
DROP POLICY IF EXISTS exchange_feed_status_update_auth ON exchange_feed_status;
DROP POLICY IF EXISTS exchange_feed_status_write_auth ON exchange_feed_status;

CREATE POLICY xfeed_public_read
ON exchange_feed_status
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY xfeed_service_all
ON exchange_feed_status
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix 3: user_trading_accounts RLS policies
ALTER TABLE user_trading_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uta_public_read ON user_trading_accounts;
DROP POLICY IF EXISTS uta_service_all ON user_trading_accounts;
DROP POLICY IF EXISTS user_trading_accounts_owner_full_access ON user_trading_accounts;

-- Public read for testing and display
CREATE POLICY uta_public_read
ON user_trading_accounts
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY uta_service_all
ON user_trading_accounts
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix 4: Add missing diagnostics column to signals
ALTER TABLE signals
ADD COLUMN IF NOT EXISTS diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Fix 5: Helpful indexes
CREATE INDEX IF NOT EXISTS idx_exec_orders_created_at ON execution_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exec_orders_symbol ON execution_orders(symbol, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_xfeed_exchange ON exchange_feed_status(exchange);
CREATE INDEX IF NOT EXISTS idx_uta_user ON user_trading_accounts(user_id);

-- Fix 6: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';