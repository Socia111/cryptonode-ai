-- Remove all trading-related tables and policies
DROP TABLE IF EXISTS user_trading_configs CASCADE;
DROP TABLE IF EXISTS trading_positions CASCADE;
DROP TABLE IF EXISTS trading_orders CASCADE;
DROP TABLE IF EXISTS trading_risk_state CASCADE;
DROP TABLE IF EXISTS trading_execution_log CASCADE;
DROP TABLE IF EXISTS automated_trading_sessions CASCADE;
DROP TABLE IF EXISTS exchange_accounts CASCADE;