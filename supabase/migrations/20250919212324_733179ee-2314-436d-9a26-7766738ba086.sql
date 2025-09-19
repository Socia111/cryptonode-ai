-- Step 1: Add missing credentials_source column to execution_orders
ALTER TABLE execution_orders 
ADD COLUMN IF NOT EXISTS credentials_source text DEFAULT 'system';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_execution_orders_credentials_source 
ON execution_orders(credentials_source);

-- Update existing records
UPDATE execution_orders 
SET credentials_source = 'system' 
WHERE credentials_source IS NULL;