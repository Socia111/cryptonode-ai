-- Remove paper trading flags and optimize for real trading
ALTER TABLE execution_orders 
DROP COLUMN IF EXISTS paper_mode;

-- Add real trading tracking columns
ALTER TABLE execution_orders 
ADD COLUMN IF NOT EXISTS real_trade boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS bybit_order_status text,
ADD COLUMN IF NOT EXISTS executed_qty numeric,
ADD COLUMN IF NOT EXISTS executed_price numeric,
ADD COLUMN IF NOT EXISTS commission numeric,
ADD COLUMN IF NOT EXISTS commission_asset text DEFAULT 'USDT';

-- Update execution queue to support real trading
ALTER TABLE execution_queue
ADD COLUMN IF NOT EXISTS real_trading boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS exchange_order_id text,
ADD COLUMN IF NOT EXISTS order_status text,
ADD COLUMN IF NOT EXISTS executed_price numeric,
ADD COLUMN IF NOT EXISTS executed_qty numeric,
ADD COLUMN IF NOT EXISTS commission numeric;

-- Remove paper trading from trading executions
UPDATE trading_executions 
SET status = 'live_executed' 
WHERE status = 'paper_executed';

-- Create index for real trading performance
CREATE INDEX IF NOT EXISTS idx_execution_orders_real_trading 
ON execution_orders(real_trade, created_at DESC) 
WHERE real_trade = true;

-- Create index for active real orders
CREATE INDEX IF NOT EXISTS idx_execution_queue_real_active 
ON execution_queue(real_trading, status, created_at) 
WHERE real_trading = true AND status IN ('queued', 'processing');