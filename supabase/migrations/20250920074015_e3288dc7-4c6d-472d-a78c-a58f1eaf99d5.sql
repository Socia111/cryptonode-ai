-- Add the missing hvp column to signals table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'signals' AND column_name = 'hvp') THEN
        ALTER TABLE signals ADD COLUMN hvp numeric;
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_signals_hvp ON signals(hvp) WHERE hvp IS NOT NULL;
    END IF;
END $$;