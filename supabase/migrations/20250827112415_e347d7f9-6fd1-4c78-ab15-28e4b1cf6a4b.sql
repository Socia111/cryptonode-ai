-- Fix security issues for new tables
-- Enable RLS for eval_logs table
ALTER TABLE eval_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for eval_logs - only service role can access
CREATE POLICY "Service role can manage eval logs" ON eval_logs
FOR ALL USING (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
) WITH CHECK (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
);

-- Enable RLS for subscribers table
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for subscribers table
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

-- Create policy for configs - read-only for authenticated users, manage for service role
CREATE POLICY "Anyone can view configs" ON configs
FOR SELECT USING (true);

CREATE POLICY "Service role can manage configs" ON configs
FOR ALL USING (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
) WITH CHECK (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
);