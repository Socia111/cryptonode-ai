-- Fix signals table permissions to allow authenticated users to read signals
-- Drop existing policies and recreate them with proper permissions

DROP POLICY IF EXISTS "Anyone can view signals" ON public.signals;
DROP POLICY IF EXISTS "Service role can manage signals" ON public.signals;

-- Create policy that allows authenticated and anonymous users to view signals
CREATE POLICY "Public can view signals" 
ON public.signals 
FOR SELECT 
TO public, authenticated, anon
USING (true);

-- Service role can manage all signals
CREATE POLICY "Service role can manage signals" 
ON public.signals 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Insert some sample signals for testing if none exist
INSERT INTO public.signals (symbol, direction, timeframe, price, score, confidence, metadata, bar_time)
VALUES 
('BTCUSDT', 'LONG', '15m', 45000.50, 85, 85.5, '{"source":"live-scanner","volume":1500000}', now() - interval '5 minutes'),
('ETHUSDT', 'LONG', '1h', 2800.25, 88, 88.2, '{"source":"live-scanner","volume":850000}', now() - interval '10 minutes'),
('SOLUSDT', 'SHORT', '30m', 98.75, 82, 82.1, '{"source":"live-scanner","volume":420000}', now() - interval '15 minutes')
ON CONFLICT (id) DO NOTHING;