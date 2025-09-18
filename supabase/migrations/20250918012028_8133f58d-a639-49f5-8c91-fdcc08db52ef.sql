-- AITRADEX1 System Blueprint - Database Schema Setup

-- 1) Update existing signals table to match blueprint schema
ALTER TABLE public.signals 
  ADD COLUMN IF NOT EXISTS entry_price numeric,
  ADD COLUMN IF NOT EXISTS stop_loss numeric,
  ADD COLUMN IF NOT EXISTS take_profit numeric,
  ADD COLUMN IF NOT EXISTS bar_time timestamptz,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- 2) Update existing markets table to match blueprint
ALTER TABLE public.markets 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'linear',
  ADD COLUMN IF NOT EXISTS min_qty numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS min_notional_usd numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS tick_size numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS qty_step numeric DEFAULT 0.001,
  ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;

-- 3) Create instruments_cache table (Bybit instruments-info results)
CREATE TABLE IF NOT EXISTS public.instruments_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,  -- linear/spot/inverse
  payload jsonb NOT NULL,  -- raw instruments list
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Create execution_orders table (our order log, not exchange fills)
CREATE TABLE IF NOT EXISTS public.execution_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('Buy','Sell')),
  qty numeric,
  amount_usd numeric,
  leverage int DEFAULT 1,
  status text NOT NULL DEFAULT 'requested', -- requested|placed|failed
  paper_mode boolean NOT NULL DEFAULT true,
  exchange_order_id text,
  ret_code int,
  ret_msg text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Update trade_logs table to match blueprint
ALTER TABLE public.trade_logs 
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS level text DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS context jsonb DEFAULT '{}'::jsonb;

-- 6) Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.instruments_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to match blueprint

-- Signals policies (read-only public, service role can insert)
DROP POLICY IF EXISTS "signals_read_public" ON public.signals;
DROP POLICY IF EXISTS "signals_insert_service" ON public.signals;

CREATE POLICY "signals_read_public"
  ON public.signals FOR SELECT
  USING (true);

CREATE POLICY "signals_insert_service"
  ON public.signals FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Markets + instruments_cache read-only to all
DROP POLICY IF EXISTS "markets_public_read" ON public.markets;
CREATE POLICY "markets_public_read"
  ON public.markets FOR SELECT 
  USING (true);

CREATE POLICY "inst_cache_public_read"
  ON public.instruments_cache FOR SELECT 
  USING (true);

CREATE POLICY "inst_cache_service_manage"
  ON public.instruments_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Execution orders: owner only
CREATE POLICY "orders_owner_select"
  ON public.execution_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders_owner_insert"
  ON public.execution_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_service_manage"
  ON public.execution_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- App settings - service role only
CREATE POLICY "app_settings_service_manage"
  ON public.app_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Insert sample markets data
INSERT INTO public.markets(symbol, category, min_qty, min_notional_usd, tick_size, qty_step, enabled) VALUES
('BTCUSDT','linear',0.001,5,0.1,0.001,true),
('ETHUSDT','linear',0.001,5,0.05,0.001,true),
('LINKUSDT','linear',0.1,5,0.001,0.001,true),
('ADAUSDT','linear',1,5,0.0001,1,true),
('SOLUSDT','linear',0.01,5,0.001,0.001,true),
('DOTUSDT','linear',0.1,5,0.001,0.001,true),
('BNBUSDT','linear',0.001,5,0.01,0.001,true),
('XRPUSDT','linear',1,5,0.0001,1,true)
ON CONFLICT (symbol) DO UPDATE SET 
  category = EXCLUDED.category,
  min_qty = EXCLUDED.min_qty,
  min_notional_usd = EXCLUDED.min_notional_usd,
  tick_size = EXCLUDED.tick_size,
  qty_step = EXCLUDED.qty_step,
  enabled = EXCLUDED.enabled;