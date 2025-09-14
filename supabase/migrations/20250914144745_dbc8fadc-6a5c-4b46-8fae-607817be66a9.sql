-- Add missing atr column for Average True Range technical indicator
ALTER TABLE public.signals 
ADD COLUMN atr numeric;