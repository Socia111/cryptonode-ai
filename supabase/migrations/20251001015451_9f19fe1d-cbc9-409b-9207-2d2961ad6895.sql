-- Fix RLS policies for aira_rankings and spynx_scores to allow public read
DROP POLICY IF EXISTS "Public read aira_rankings" ON aira_rankings;
DROP POLICY IF EXISTS "Public read spynx_scores" ON spynx_scores;

CREATE POLICY "Allow public read aira_rankings"
ON aira_rankings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read spynx_scores"
ON spynx_scores FOR SELECT
TO anon, authenticated
USING (true);

-- Ensure service role can manage these tables
CREATE POLICY "Service role full access aira_rankings"
ON aira_rankings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access spynx_scores"
ON spynx_scores FOR ALL
TO service_role
USING (true)
WITH CHECK (true);