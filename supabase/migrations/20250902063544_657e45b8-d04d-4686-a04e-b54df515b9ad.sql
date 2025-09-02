-- Insert sample data into spynx_scores table for testing
INSERT INTO public.spynx_scores (
  token_symbol, token_name, score, market_cap, volume_24h, price_change_24h, 
  liquidity, holder_count, whale_activity, sentiment, roi_forecast, price
) VALUES
  ('BTC', 'Bitcoin', 95.2, 1200000000000, 25000000000, 2.5, 0.95, 1000000, 0.75, 0.85, 15.2, 67000),
  ('ETH', 'Ethereum', 92.8, 450000000000, 12000000000, 1.8, 0.88, 500000, 0.68, 0.82, 18.5, 3500),
  ('SOL', 'Solana', 89.5, 85000000000, 2500000000, 4.2, 0.82, 180000, 0.78, 0.75, 22.1, 200),
  ('ADA', 'Cardano', 85.3, 35000000000, 800000000, -1.2, 0.75, 120000, 0.65, 0.70, 12.8, 0.95),
  ('DOT', 'Polkadot', 82.7, 15000000000, 400000000, 3.1, 0.68, 85000, 0.72, 0.68, 19.3, 12.5),
  ('AVAX', 'Avalanche', 80.9, 12000000000, 600000000, 2.8, 0.71, 65000, 0.69, 0.73, 16.7, 35),
  ('MATIC', 'Polygon', 78.4, 8000000000, 350000000, -0.5, 0.63, 45000, 0.58, 0.65, 14.2, 0.85),
  ('LINK', 'Chainlink', 76.2, 7500000000, 450000000, 1.9, 0.66, 38000, 0.61, 0.69, 17.8, 15.2);

-- Insert sample AIRA rankings data
INSERT INTO public.aira_rankings (
  rank_position, token_symbol, token_name, score, market_cap, ai_category
) VALUES
  (1, 'FET', 'Fetch.ai', 94.5, 2500000000, 'AI Infrastructure'),
  (2, 'OCEAN', 'Ocean Protocol', 91.2, 1800000000, 'Data Marketplace'),
  (3, 'AGIX', 'SingularityNET', 88.7, 1200000000, 'AI Platform'),
  (4, 'RLC', 'iExec RLC', 85.3, 850000000, 'Cloud Computing'),
  (5, 'TAO', 'Bittensor', 83.9, 750000000, 'AI Training'),
  (6, 'GRT', 'The Graph', 81.4, 650000000, 'Data Indexing'),
  (7, 'RENDER', 'Render Token', 79.8, 580000000, 'GPU Rendering'),
  (8, 'GLM', 'Golem', 77.2, 420000000, 'Computing Power'),
  (9, 'NMR', 'Numeraire', 75.6, 380000000, 'Prediction Market'),
  (10, 'COTI', 'COTI', 73.1, 290000000, 'AI Payment');