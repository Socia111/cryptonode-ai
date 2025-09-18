-- AITRADEX1 System Blueprint - Clean Database Setup

-- 1) Create missing tables only
CREATE TABLE IF NOT EXISTS public.instruments_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Add missing columns to existing tables
ALTER TABLE public.signals 
  ADD COLUMN IF NOT EXISTS entry_price numeric,
  ADD COLUMN IF NOT EXISTS stop_loss numeric,
  ADD COLUMN IF NOT EXISTS take_profit numeric,
  ADD COLUMN IF NOT EXISTS bar_time timestamptz,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.markets 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'linear',
  ADD COLUMN IF NOT EXISTS min_qty numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS min_notional_usd numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS tick_size numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS qty_step numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;

-- 3) Enable RLS on new tables
ALTER TABLE public.instruments_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 4) Create only non-existing policies
DO $$ 
BEGIN
  -- Execution orders policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'execution_orders' AND policyname = 'orders_owner_select') THEN
    CREATE POLICY "orders_owner_select" ON public.execution_orders FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'execution_orders' AND policyname = 'orders_owner_insert') THEN
    CREATE POLICY "orders_owner_insert" ON public.execution_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'execution_orders' AND policyname = 'orders_service_manage') THEN
    CREATE POLICY "orders_service_manage" ON public.execution_orders FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;

  -- Instruments cache policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instruments_cache' AND policyname = 'inst_cache_public_read') THEN
    CREATE POLICY "inst_cache_public_read" ON public.instruments_cache FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instruments_cache' AND policyname = 'inst_cache_service_manage') THEN
    CREATE POLICY "inst_cache_service_manage" ON public.instruments_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;

  -- App settings policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'app_settings_service_manage') THEN
    CREATE POLICY "app_settings_service_manage" ON public.app_settings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 5) Insert/update sample markets data
INSERT INTO public.markets(symbol, base_asset, quote_asset, exchange, category, min_qty, min_notional_usd, tick_size, qty_step, enabled) VALUES
('BTCUSDT','BTC','USDT','bybit','linear',0.001,5,0.1,0.001,true),
('ETHUSDT','ETH','USDT','bybit','linear',0.001,5,0.05,0.001,true),
('LINKUSDT','LINK','USDT','bybit','linear',0.1,5,0.001,0.001,true),
('ADAUSDT','ADA','USDT','bybit','linear',1,5,0.0001,1,true),
('SOLUSDT','SOL','USDT','bybit','linear',0.01,5,0.001,0.001,true),
('DOTUSDT','DOT','USDT','bybit','linear',0.1,5,0.001,0.001,true),
('BNBUSDT','BNB','USDT','bybit','linear',0.001,5,0.01,0.001,true),
('XRPUSDT','XRP','USDT','bybit','linear',1,5,0.0001,1,true)
ON CONFLICT (symbol) DO UPDATE SET 
  category = EXCLUDED.category,
  min_qty = EXCLUDED.min_qty,
  min_notional_usd = EXCLUDED.min_notional_usd,
  tick_size = EXCLUDED.tick_size,
  qty_step = EXCLUDED.qty_step,
  enabled = EXCLUDED.enabled;