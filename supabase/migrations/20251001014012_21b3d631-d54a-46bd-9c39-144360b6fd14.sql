-- Phase 2: Database Schema Completion
-- Fix trading_stats RLS policies
DROP POLICY IF EXISTS "Public read trading_stats" ON trading_stats;
DROP POLICY IF EXISTS "Users can manage own trading stats" ON trading_stats;
DROP POLICY IF EXISTS "Users can view own trading stats" ON trading_stats;

CREATE POLICY "Public read trading_stats"
ON trading_stats FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage own trading stats"
ON trading_stats FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access trading_stats"
ON trading_stats FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create missing tables from documentation

-- AIRA Rankings table for token scoring
CREATE TABLE IF NOT EXISTS aira_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  rank integer NOT NULL,
  score numeric NOT NULL,
  volume_24h numeric,
  market_cap numeric,
  price_change_24h numeric,
  aira_indicators jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(symbol, created_at)
);

ALTER TABLE aira_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read aira_rankings"
ON aira_rankings FOR SELECT
USING (true);

CREATE POLICY "Service role manages aira_rankings"
ON aira_rankings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Alert subscriptions for notifications
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  alert_type text NOT NULL,
  threshold numeric,
  is_active boolean DEFAULT true,
  telegram_enabled boolean DEFAULT false,
  email_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert subscriptions"
ON alert_subscriptions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Spynx scores for performance metrics
CREATE TABLE IF NOT EXISTS spynx_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  timeframe text NOT NULL,
  score integer NOT NULL,
  confidence numeric NOT NULL,
  momentum numeric,
  volatility numeric,
  volume_profile numeric,
  trend_strength numeric,
  indicators jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(symbol, timeframe, created_at)
);

ALTER TABLE spynx_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read spynx_scores"
ON spynx_scores FOR SELECT
USING (true);

CREATE POLICY "Service role manages spynx_scores"
ON spynx_scores FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aira_rankings_symbol ON aira_rankings(symbol);
CREATE INDEX IF NOT EXISTS idx_aira_rankings_created_at ON aira_rankings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spynx_scores_symbol_timeframe ON spynx_scores(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_spynx_scores_created_at ON spynx_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_user_id ON alert_subscriptions(user_id);

-- Update triggers
CREATE TRIGGER update_aira_rankings_updated_at
  BEFORE UPDATE ON aira_rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_subscriptions_updated_at
  BEFORE UPDATE ON alert_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();