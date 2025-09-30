-- Fix trading_stats RLS policy for public read access
DROP POLICY IF EXISTS "Public read trading_stats" ON trading_stats;
DROP POLICY IF EXISTS "Service role can manage all trading stats" ON trading_stats;

CREATE POLICY "Public read trading_stats"
  ON trading_stats
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manages trading_stats"
  ON trading_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users manage own trading_stats"
  ON trading_stats
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);