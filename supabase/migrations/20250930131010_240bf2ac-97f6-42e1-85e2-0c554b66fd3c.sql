-- Fix live_prices table permissions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Live prices are viewable by everyone" ON live_prices;
DROP POLICY IF EXISTS "Service role can insert live prices" ON live_prices;
DROP POLICY IF EXISTS "Service role can update live prices" ON live_prices;
DROP POLICY IF EXISTS "service_role_manage_live_prices" ON live_prices;

-- Create permissive policies for live_prices table
CREATE POLICY "Public can read live prices"
  ON live_prices FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated can read live prices"
  ON live_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to live prices"
  ON live_prices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read live prices"
  ON live_prices FOR SELECT
  TO anon
  USING (true);