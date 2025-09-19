-- Add comprehensive symbols for better signal coverage
INSERT INTO live_market_data (symbol, base_asset, quote_asset, exchange, price, volume, change_24h_percent) VALUES
-- Major cryptocurrencies
('BTCUSDT', 'BTC', 'USDT', 'bybit', 43000 + random() * 1000, 100000000 + random() * 50000000, (random() - 0.5) * 10),
('ETHUSDT', 'ETH', 'USDT', 'bybit', 2400 + random() * 200, 80000000 + random() * 40000000, (random() - 0.5) * 8),
('ADAUSDT', 'ADA', 'USDT', 'bybit', 0.35 + random() * 0.1, 50000000 + random() * 25000000, (random() - 0.5) * 12),
('DOTUSDT', 'DOT', 'USDT', 'bybit', 5.5 + random() * 1, 30000000 + random() * 15000000, (random() - 0.5) * 8),
('LINKUSDT', 'LINK', 'USDT', 'bybit', 14 + random() * 3, 40000000 + random() * 20000000, (random() - 0.5) * 9),
('LTCUSDT', 'LTC', 'USDT', 'bybit', 95 + random() * 10, 25000000 + random() * 12000000, (random() - 0.5) * 7),
('BCHUSDT', 'BCH', 'USDT', 'bybit', 380 + random() * 40, 20000000 + random() * 10000000, (random() - 0.5) * 8),
('XLMUSDT', 'XLM', 'USDT', 'bybit', 0.11 + random() * 0.02, 15000000 + random() * 8000000, (random() - 0.5) * 15),
('VETUSDT', 'VET', 'USDT', 'bybit', 0.025 + random() * 0.005, 12000000 + random() * 6000000, (random() - 0.5) * 12),
('TRXUSDT', 'TRX', 'USDT', 'bybit', 0.065 + random() * 0.01, 18000000 + random() * 9000000, (random() - 0.5) * 10),

-- DeFi tokens
('UNIUSDT', 'UNI', 'USDT', 'bybit', 7.5 + random() * 1.5, 35000000 + random() * 17000000, (random() - 0.5) * 11),
('AAVEUSDT', 'AAVE', 'USDT', 'bybit', 85 + random() * 15, 8000000 + random() * 4000000, (random() - 0.5) * 13),
('COMPUSDT', 'COMP', 'USDT', 'bybit', 45 + random() * 8, 5000000 + random() * 2500000, (random() - 0.5) * 12),
('SNXUSDT', 'SNX', 'USDT', 'bybit', 2.1 + random() * 0.4, 6000000 + random() * 3000000, (random() - 0.5) * 14),
('MKRUSDT', 'MKR', 'USDT', 'bybit', 1200 + random() * 200, 3000000 + random() * 1500000, (random() - 0.5) * 10),

-- Layer 1 alternatives
('SOLUSDT', 'SOL', 'USDT', 'bybit', 100 + random() * 20, 60000000 + random() * 30000000, (random() - 0.5) * 15),
('AVAXUSDT', 'AVAX', 'USDT', 'bybit', 25 + random() * 5, 25000000 + random() * 12000000, (random() - 0.5) * 12),
('MATICUSDT', 'MATIC', 'USDT', 'bybit', 0.85 + random() * 0.15, 45000000 + random() * 22000000, (random() - 0.5) * 11),
('FTMUSDT', 'FTM', 'USDT', 'bybit', 0.42 + random() * 0.08, 20000000 + random() * 10000000, (random() - 0.5) * 13),
('NEARUSDT', 'NEAR', 'USDT', 'bybit', 3.2 + random() * 0.6, 15000000 + random() * 7000000, (random() - 0.5) * 12),

-- Meme and trending coins
('DOGEUSDT', 'DOGE', 'USDT', 'bybit', 0.078 + random() * 0.015, 80000000 + random() * 40000000, (random() - 0.5) * 20),
('SHIBUSDT', 'SHIB', 'USDT', 'bybit', 0.000009 + random() * 0.000002, 60000000 + random() * 30000000, (random() - 0.5) * 25),
('PEPEUSDT', 'PEPE', 'USDT', 'bybit', 0.00000085 + random() * 0.0000002, 40000000 + random() * 20000000, (random() - 0.5) * 30),

-- Gaming and NFT tokens
('AXSUSDT', 'AXS', 'USDT', 'bybit', 6.5 + random() * 1.2, 12000000 + random() * 6000000, (random() - 0.5) * 15),
('SANDUSDT', 'SAND', 'USDT', 'bybit', 0.38 + random() * 0.07, 18000000 + random() * 9000000, (random() - 0.5) * 16),
('MANAUSDT', 'MANA', 'USDT', 'bybit', 0.45 + random() * 0.08, 22000000 + random() * 11000000, (random() - 0.5) * 14),

-- Exchange tokens
('BNBUSDT', 'BNB', 'USDT', 'bybit', 320 + random() * 40, 35000000 + random() * 17000000, (random() - 0.5) * 8),
('CAKEUSDT', 'CAKE', 'USDT', 'bybit', 2.8 + random() * 0.5, 8000000 + random() * 4000000, (random() - 0.5) * 12),

-- AI and tech tokens
('FETUSDT', 'FET', 'USDT', 'bybit', 1.35 + random() * 0.25, 15000000 + random() * 7000000, (random() - 0.5) * 14),
('OCEANUSDT', 'OCEAN', 'USDT', 'bybit', 0.52 + random() * 0.1, 10000000 + random() * 5000000, (random() - 0.5) * 13),
('AGIXUSDT', 'AGIX', 'USDT', 'bybit', 0.28 + random() * 0.05, 12000000 + random() * 6000000, (random() - 0.5) * 15)

ON CONFLICT (symbol, exchange) DO UPDATE SET
  price = EXCLUDED.price,
  volume = EXCLUDED.volume,
  change_24h_percent = EXCLUDED.change_24h_percent,
  updated_at = NOW();