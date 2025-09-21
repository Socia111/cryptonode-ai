-- Clean up old 15m signals from deprecated engines
DELETE FROM signals WHERE timeframe = '15m' AND source = 'enhanced_signal_generation';