-- Fix signals table permissions and constraints
-- First drop and recreate policies properly

DROP POLICY IF EXISTS "Anyone can view signals" ON public.signals;
DROP POLICY IF EXISTS "Service role can manage signals" ON public.signals;

-- Create policy that allows public access to view signals
CREATE POLICY "Public can view signals" 
ON public.signals 
FOR SELECT 
USING (true);

-- Service role can manage all signals  
CREATE POLICY "Service role can manage signals"
ON public.signals 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Check current constraints and fix if needed
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'signals' AND constraint_name = 'signals_confidence_check') THEN
        ALTER TABLE public.signals DROP CONSTRAINT signals_confidence_check;
    END IF;
    
    -- Add proper constraint for confidence (0-100 range)
    ALTER TABLE public.signals ADD CONSTRAINT signals_confidence_check 
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100));
    
    -- Add proper constraint for score (0-100 range)  
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'signals' AND constraint_name = 'signals_score_check') THEN
        ALTER TABLE public.signals ADD CONSTRAINT signals_score_check 
        CHECK (score >= 0 AND score <= 100);
    END IF;
END $$;

-- Insert sample signals with proper values
INSERT INTO public.signals (symbol, direction, timeframe, price, score, confidence, metadata, bar_time)
VALUES 
('BTCUSDT', 'LONG', '15m', 45000.50, 85, 85.5, '{"source":"live-scanner","volume":1500000}', now() - interval '5 minutes'),
('ETHUSDT', 'LONG', '1h', 2800.25, 88, 88.2, '{"source":"live-scanner","volume":850000}', now() - interval '10 minutes'),
('SOLUSDT', 'SHORT', '30m', 98.75, 82, 82.1, '{"source":"live-scanner","volume":420000}', now() - interval '15 minutes'),
('ADAUSDT', 'LONG', '15m', 0.45, 83, 83.7, '{"source":"live-scanner","volume":320000}', now() - interval '20 minutes'),
('DOTUSDT', 'SHORT', '1h', 5.85, 86, 86.3, '{"source":"live-scanner","volume":180000}', now() - interval '25 minutes')
ON CONFLICT (id) DO NOTHING;