-- Add missing 'algo' column to signals table for algorithm identification
ALTER TABLE public.signals 
ADD COLUMN algo text DEFAULT 'quantum_ai';