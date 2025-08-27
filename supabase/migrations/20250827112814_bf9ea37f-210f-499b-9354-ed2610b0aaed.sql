-- Fix security issues for new tables (handle existing policies)
-- Enable RLS for eval_logs table
ALTER TABLE eval_logs ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy for eval_logs if it exists
DROP POLICY IF EXISTS "Service role can manage eval logs" ON eval_logs;
CREATE POLICY "Service role can manage eval logs" ON eval_logs
FOR ALL USING (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
) WITH CHECK (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
);

-- Enable RLS for subscribers table
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for subscribers table if they exist
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON subscribers;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscribers;

CREATE POLICY "Users can manage their own subscriptions" ON subscribers
FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Service role can manage all subscriptions" ON subscribers
FOR ALL USING (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
) WITH CHECK (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
);

-- Enable RLS for configs table
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for configs if they exist
DROP POLICY IF EXISTS "Anyone can view configs" ON configs;
DROP POLICY IF EXISTS "Service role can manage configs" ON configs;

CREATE POLICY "Anyone can view configs" ON configs
FOR SELECT USING (true);

CREATE POLICY "Service role can manage configs" ON configs
FOR ALL USING (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
) WITH CHECK (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
);