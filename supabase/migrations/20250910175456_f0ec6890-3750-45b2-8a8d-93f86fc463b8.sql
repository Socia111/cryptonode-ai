-- Update the symbol whitelist to include the symbols that are being traded
-- Add more trading pairs that match the format used in signals
UPDATE trading_config 
SET symbol_whitelist = ARRAY[
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT',
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 'AVAX/USDT',
  'DUSKUSDT', 'DUSK/USDT', 'AXLUSDT', 'AXL/USDT', 'LSKUSDT', 'LSK/USDT', 
  'ARIAUSDT', 'ARIA/USDT', 'ARKUSDT', 'ARK/USDT', 'OMNIUSDT', 'OMNI/USDT',
  'FUSDT', 'F/USDT', 'HIVEUSDT', 'HIVE/USDT', 'SAHARAUSDT', 'SAHARA/USDT'
]
WHERE id = 'fc48936e-93c3-4cfc-85bd-23d0c74b767b';