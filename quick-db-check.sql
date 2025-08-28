-- Quick database freshness check
SELECT 
  'signals' as table_name,
  exchange, 
  COUNT(*) as total_signals,
  COUNT(CASE WHEN aira_rank IS NOT NULL THEN 1 END) as aira_boosted,
  MAX(created_at) as last_signal,
  ROUND(AVG(confidence_score), 2) as avg_confidence
FROM public.signals 
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY exchange 
ORDER BY last_signal DESC;

-- AIRA rankings status
SELECT 
  'aira_rankings' as table_name,
  COUNT(*) as total_rankings,
  MIN(rank_position) as min_rank,
  MAX(rank_position) as max_rank,
  MAX(last_updated) as last_updated
FROM public.aira_rankings;

-- ROI projection summary
SELECT 
  direction,
  COUNT(*) as signal_count,
  ROUND(AVG(CASE 
    WHEN direction='LONG' AND tp IS NOT NULL THEN 100.0 * (tp - price) / price
    WHEN direction='SHORT' AND tp IS NOT NULL THEN 100.0 * (price - tp) / price
    ELSE NULL 
  END), 2) as avg_roi_target_pct,
  ROUND(AVG(confidence_score), 2) as avg_confidence
FROM public.signals 
WHERE created_at > now() - INTERVAL '24 hours'
  AND tp IS NOT NULL
GROUP BY direction;