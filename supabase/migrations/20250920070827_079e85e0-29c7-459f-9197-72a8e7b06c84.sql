-- Phase 5: Database Schema Expansion - Performance Optimizations and Indexes (Fixed)

-- Create indexes for signals table (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_signals_active_score 
ON signals (is_active, score DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_signals_timeframe_created 
ON signals (timeframe, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_symbol_direction 
ON signals (symbol, direction, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_score_confidence 
ON signals (score DESC, confidence DESC) 
WHERE is_active = true AND score >= 60;

-- Composite index for trading execution queries
CREATE INDEX IF NOT EXISTS idx_execution_orders_user_status 
ON execution_orders (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_orders_symbol_created 
ON execution_orders (symbol, created_at DESC);

-- Edge event log indexes for monitoring
CREATE INDEX IF NOT EXISTS idx_edge_event_log_fn_stage 
ON edge_event_log (fn, stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_event_log_created_desc 
ON edge_event_log (created_at DESC);

-- User trading accounts indexes
CREATE INDEX IF NOT EXISTS idx_user_trading_accounts_user_active 
ON user_trading_accounts (user_id, is_active) 
WHERE is_active = true;

-- Automated trading config indexes
CREATE INDEX IF NOT EXISTS idx_automated_trading_config_enabled 
ON automated_trading_config (enabled, user_id) 
WHERE enabled = true;

-- System status indexes
CREATE INDEX IF NOT EXISTS idx_system_status_service_update 
ON system_status (service_name, last_update DESC);

-- Live market data indexes
CREATE INDEX IF NOT EXISTS idx_live_market_data_symbol_updated 
ON live_market_data (symbol, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_market_data_exchange_updated 
ON live_market_data (exchange, updated_at DESC);