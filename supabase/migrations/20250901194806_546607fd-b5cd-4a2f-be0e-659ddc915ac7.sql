-- Remove sample data and trigger real data collection
DELETE FROM public.quantum_analysis WHERE symbol IN ('BTCUSDT', 'ETHUSDT', 'SOLUSDT');
DELETE FROM public.signals WHERE exchange = 'bybit' AND symbol IN ('BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT');
DELETE FROM public.spynx_portfolios WHERE portfolio_name IN ('Alpha Momentum Pro', 'Quantum Scalper Elite', 'Diamond Hands DCA', 'Lightning Arbitrage', 'Zen Master Swing');