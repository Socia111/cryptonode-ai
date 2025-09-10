-- Clean up any potential mock or simulation signals
-- This ensures only real market data remains

-- Delete any signals that might be test/mock data
DELETE FROM signals 
WHERE symbol LIKE '%TEST%' 
   OR symbol LIKE '%MOCK%' 
   OR symbol LIKE '%SIM%' 
   OR symbol LIKE '%DEMO%'
   OR algo LIKE '%test%' 
   OR algo LIKE '%mock%' 
   OR algo LIKE '%sim%'
   OR (score IN (75.0, 85.0, 95.0) AND price = 1.0)  -- Exact mock patterns
   OR (symbol = 'BTCUSDT' AND price = 50000.0)  -- Common test values
   OR (symbol = 'ETHUSDT' AND price = 3000.0);  -- Common test values

-- Add a check constraint to prevent mock data insertion
-- (This will be a trigger since CHECK constraints can't reference functions)
CREATE OR REPLACE FUNCTION validate_real_signal()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent obvious mock/test signals
    IF NEW.symbol LIKE '%TEST%' 
       OR NEW.symbol LIKE '%MOCK%' 
       OR NEW.symbol LIKE '%SIM%' 
       OR NEW.symbol LIKE '%DEMO%'
       OR NEW.algo LIKE '%test%' 
       OR NEW.algo LIKE '%mock%' 
       OR NEW.algo LIKE '%sim%' THEN
        RAISE EXCEPTION 'Mock or test signals are not allowed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate signals on insert
DROP TRIGGER IF EXISTS validate_signal_trigger ON signals;
CREATE TRIGGER validate_signal_trigger
    BEFORE INSERT ON signals
    FOR EACH ROW
    EXECUTE FUNCTION validate_real_signal();