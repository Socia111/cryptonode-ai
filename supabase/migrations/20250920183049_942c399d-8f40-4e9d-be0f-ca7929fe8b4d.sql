-- Fix missing relaxed_mode column in signals table
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS relaxed_mode boolean DEFAULT false;

-- Ensure realtime is working properly for signals
ALTER TABLE public.signals REPLICA IDENTITY FULL;