-- Add missing paper_mode column to user_trading_configs
ALTER TABLE public.user_trading_configs 
ADD COLUMN IF NOT EXISTS paper_mode BOOLEAN DEFAULT true;