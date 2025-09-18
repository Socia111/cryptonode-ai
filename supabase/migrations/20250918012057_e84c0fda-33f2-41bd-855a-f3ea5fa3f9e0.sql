-- Fix the markets table base_asset constraint issue
-- First, update existing records to extract base_asset from symbol
UPDATE public.markets 
SET base_asset = REPLACE(symbol, 'USDT', '')
WHERE base_asset IS NULL;

-- Now add the new columns if they don't exist
ALTER TABLE public.markets 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'linear',
  ADD COLUMN IF NOT EXISTS min_qty numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS min_notional_usd numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS tick_size numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS qty_step numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;

-- Create instruments_cache table
CREATE TABLE IF NOT EXISTS public.instruments_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Create execution_orders table
CREATE TABLE IF NOT EXISTS public.execution_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('Buy','Sell')),
  qty numeric,
  amount_usd numeric,
  leverage int DEFAULT 1,
  status text NOT NULL DEFAULT 'requested',
  paper_mode boolean NOT NULL DEFAULT true,
  exchange_order_id text,
  ret_code int,
  ret_msg text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instruments_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_orders ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "inst_cache_public_read" ON public.instruments_cache FOR SELECT USING (true);
CREATE POLICY "inst_cache_service_manage" ON public.instruments_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "orders_owner_select" ON public.execution_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_owner_insert" ON public.execution_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_service_manage" ON public.execution_orders FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "app_settings_service_manage" ON public.app_settings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Update markets data with proper base_asset values
UPDATE public.markets SET 
  category = 'linear',
  min_qty = CASE 
    WHEN symbol IN ('ADAUSDT', 'XRPUSDT') THEN 1
    WHEN symbol = 'LINKUSDT' THEN 0.1  
    WHEN symbol = 'SOLUSDT' THEN 0.01
    WHEN symbol = 'DOTUSDT' THEN 0.1
    ELSE 0.001
  END,
  min_notional_usd = 5,
  tick_size = CASE
    WHEN symbol = 'BTCUSDT' THEN 0.1
    WHEN symbol = 'ETHUSDT' THEN 0.05
    WHEN symbol IN ('ADAUSDT', 'XRPUSDT') THEN 0.0001
    WHEN symbol = 'BNBUSDT' THEN 0.01
    ELSE 0.001
  END,
  qty_step = CASE
    WHEN symbol IN ('ADAUSDT', 'XRPUSDT') THEN 1
    ELSE 0.001
  END,
  enabled = true
WHERE symbol IN ('BTCUSDT', 'ETHUSDT', 'LINKUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT', 'BNBUSDT', 'XRPUSDT');