-- Add missing avg_price column to execution_orders table
ALTER TABLE execution_orders ADD COLUMN IF NOT EXISTS avg_price NUMERIC;

-- Add missing executed_price column if not exists (backup)
ALTER TABLE execution_orders ADD COLUMN IF NOT EXISTS executed_price NUMERIC;

-- Update any existing records to have consistent data
UPDATE execution_orders 
SET avg_price = executed_price 
WHERE avg_price IS NULL AND executed_price IS NOT NULL;