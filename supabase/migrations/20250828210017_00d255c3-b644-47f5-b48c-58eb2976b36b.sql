-- Database safety nets for AItradeX1 signals

-- Prevent spam on same bar/direction
CREATE UNIQUE INDEX IF NOT EXISTS ux_signals_bar
ON public.signals (exchange, symbol, timeframe, direction, bar_time);

-- Speed dashboards / filters  
CREATE INDEX IF NOT EXISTS ix_signals_recent
ON public.signals (created_at DESC);

CREATE INDEX IF NOT EXISTS ix_signals_symbol_tf
ON public.signals (exchange, symbol, timeframe, created_at DESC);

-- Index for AIRA rankings lookups
CREATE INDEX IF NOT EXISTS ix_signals_aira_rank
ON public.signals (aira_rank) WHERE aira_rank IS NOT NULL;

-- Last 24h view for dashboards
CREATE OR REPLACE VIEW public.signals_last24h AS
SELECT *
FROM public.signals
WHERE created_at > now() - INTERVAL '24 hours';

-- Simple ROI projection view (uses stored tp/sl)
CREATE OR REPLACE VIEW public.signals_roi AS
SELECT 
  id, exchange, symbol, timeframe, direction, price,
  tp, sl, confidence_score, aira_rank,
  CASE 
    WHEN direction='LONG' AND tp IS NOT NULL THEN 100.0 * (tp - price) / price
    WHEN direction='SHORT' AND tp IS NOT NULL THEN 100.0 * (price - tp) / price
    ELSE NULL 
  END AS roi_target_pct,
  CASE 
    WHEN direction='LONG' AND sl IS NOT NULL THEN 100.0 * (sl - price) / price
    WHEN direction='SHORT' AND sl IS NOT NULL THEN 100.0 * (price - sl) / price
    ELSE NULL 
  END AS risk_pct,
  created_at
FROM public.signals;

-- AIRA rankings performance view
CREATE OR REPLACE VIEW public.aira_signals_performance AS
SELECT 
  ar.rank_position,
  ar.token_symbol,
  ar.token_name,
  COUNT(s.id) as total_signals,
  AVG(s.confidence_score) as avg_confidence,
  AVG(CASE 
    WHEN s.direction='LONG' AND s.tp IS NOT NULL THEN 100.0 * (s.tp - s.price) / s.price
    WHEN s.direction='SHORT' AND s.tp IS NOT NULL THEN 100.0 * (s.price - s.tp) / s.price
    ELSE NULL 
  END) AS avg_roi_target,
  MAX(s.created_at) as last_signal
FROM public.aira_rankings ar
LEFT JOIN public.signals s ON s.symbol LIKE ar.token_symbol || '%'
GROUP BY ar.rank_position, ar.token_symbol, ar.token_name
ORDER BY ar.rank_position;