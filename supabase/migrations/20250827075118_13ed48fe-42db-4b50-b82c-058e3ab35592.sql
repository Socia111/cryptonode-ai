-- 1. Markets & reference data
CREATE TABLE IF NOT EXISTS exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,        -- 'binance', 'bybit'
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id uuid REFERENCES exchanges(id) ON DELETE CASCADE,
  symbol text NOT NULL,             -- 'BTCUSDT'
  base_asset text NOT NULL,         -- 'BTC'
  quote_asset text NOT NULL,        -- 'USDT'
  tick_size numeric NOT NULL DEFAULT 0.01,
  lot_size numeric NOT NULL DEFAULT 0.0001,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(exchange_id, symbol)
);

-- 2. Price data (candles)
CREATE TABLE IF NOT EXISTS candles_1m (
  market_id uuid REFERENCES markets(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL,
  o numeric NOT NULL,
  h numeric NOT NULL,
  l numeric NOT NULL,
  c numeric NOT NULL,
  v numeric NOT NULL,
  PRIMARY KEY (market_id, ts)
);

-- 3. Strategy signals (from AItradeX/Spynx)
CREATE TABLE IF NOT EXISTS strategy_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  market_id uuid REFERENCES markets(id) ON DELETE CASCADE,
  strategy text NOT NULL,           -- 'AItradeX1', 'Spynx', 'EMA_CROSS'
  side text CHECK (side IN ('LONG','SHORT')) NOT NULL,
  confidence numeric CHECK (confidence BETWEEN 0 AND 1),
  score numeric,                    -- Spynx score or blended
  entry_hint numeric,               -- suggested price
  sl_hint numeric,                  -- stop loss
  tp_hint numeric,                  -- take profit
  meta jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- 4. Accounts / API bindings (encrypted)
CREATE TABLE IF NOT EXISTS exchange_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  exchange_id uuid REFERENCES exchanges(id) NOT NULL,
  label text,                       -- 'Bybit main'
  enc_api_key text NOT NULL,        -- KMS/Edge-encrypted blob
  enc_api_secret text NOT NULL,     -- KMS/Edge-encrypted blob
  is_paper boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, exchange_id, label)
);

-- 5. Portfolio & positions
CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  base_ccy text NOT NULL DEFAULT 'USDT',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE,
  market_id uuid REFERENCES markets(id),
  side text CHECK (side IN ('LONG','SHORT')) NOT NULL,
  qty numeric NOT NULL,
  entry_price numeric NOT NULL,
  leverage numeric DEFAULT 1,
  sl numeric, 
  tp numeric,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  status text CHECK (status IN ('OPEN','CLOSED','LIQUIDATED')) DEFAULT 'OPEN',
  pnl numeric DEFAULT 0
);

-- 6. Orders & trades (execution layer)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE,
  market_id uuid REFERENCES markets(id),
  client_order_id text,             -- for idempotency
  side text CHECK (side IN ('BUY','SELL')) NOT NULL,
  order_type text CHECK (order_type IN ('MARKET','LIMIT','STOP','STOP_LIMIT')) NOT NULL,
  price numeric, 
  qty numeric NOT NULL,
  status text CHECK (status IN ('NEW','PARTIAL','FILLED','CANCELED','REJECTED')) DEFAULT 'NEW',
  placed_at timestamptz DEFAULT now(),
  exchange_order_ref text,
  meta jsonb DEFAULT '{}'::jsonb,
  UNIQUE (portfolio_id, client_order_id)
);

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  trade_ts timestamptz NOT NULL DEFAULT now(),
  price numeric NOT NULL,
  qty numeric NOT NULL,
  fee numeric DEFAULT 0,
  fee_ccy text DEFAULT 'USDT'
);

-- 7. Alerts (Telegram / push)
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  type text CHECK (type IN ('TELEGRAM','FCM')) NOT NULL,
  target text NOT NULL,             -- telegram chat id or fcm token
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, type, target)
);

-- 8. Watchlists
CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  market_id uuid REFERENCES markets(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, market_id)
);

-- 9. Backtests / performance
CREATE TABLE IF NOT EXISTS backtests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  strategy text NOT NULL,
  params jsonb NOT NULL,
  period jsonb NOT NULL,            -- {"from":"2024-01-01","to":"2025-08-01","tf":"1h"}
  results jsonb,                    -- summarized metrics
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candles_1m_market_ts ON candles_1m (market_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_signals_market_ts ON strategy_signals (market_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_status ON positions (portfolio_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_portfolio_placed ON orders (portfolio_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_order_ts ON trades (order_id, trade_ts);

-- Enable RLS on user-scoped tables
ALTER TABLE exchange_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on public/ingestion tables
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE candles_1m ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user-scoped tables
CREATE POLICY "portfolios_read_own" ON portfolios FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "portfolios_write_own" ON portfolios FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "exchange_accounts_read_own" ON exchange_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "exchange_accounts_write_own" ON exchange_accounts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "positions_read_own" ON positions FOR SELECT USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "positions_write_own" ON positions FOR ALL USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())) WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "orders_read_own" ON orders FOR SELECT USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "orders_write_own" ON orders FOR ALL USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())) WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "trades_read_own" ON trades FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())));
CREATE POLICY "trades_write_own" ON trades FOR ALL USING (order_id IN (SELECT id FROM orders WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()))) WITH CHECK (order_id IN (SELECT id FROM orders WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())));

CREATE POLICY "signals_read_own_or_public" ON strategy_signals FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "signals_write_self" ON strategy_signals FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "alert_subscriptions_read_own" ON alert_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "alert_subscriptions_write_own" ON alert_subscriptions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "watchlist_items_read_own" ON watchlist_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "watchlist_items_write_own" ON watchlist_items FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "backtests_read_own" ON backtests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "backtests_write_own" ON backtests FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Public/ingestion table policies
CREATE POLICY "read_all_exchanges" ON exchanges FOR SELECT USING (true);
CREATE POLICY "service_writes_exchanges" ON exchanges FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "read_all_markets" ON markets FOR SELECT USING (true);
CREATE POLICY "service_writes_markets" ON markets FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_updates_markets" ON markets FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "read_candles" ON candles_1m FOR SELECT USING (true);
CREATE POLICY "service_writes_candles" ON candles_1m FOR INSERT TO service_role WITH CHECK (true);

-- Views for the UI
CREATE OR REPLACE VIEW v_active_positions AS
SELECT p.*, m.symbol, m.base_asset, m.quote_asset, e.name as exchange_name
FROM positions p
JOIN portfolios pf ON pf.id = p.portfolio_id
JOIN markets m ON m.id = p.market_id
JOIN exchanges e ON e.id = m.exchange_id
WHERE p.status = 'OPEN' AND pf.user_id = auth.uid();

CREATE OR REPLACE VIEW v_portfolio_performance AS
SELECT
  pf.id as portfolio_id,
  pf.name,
  pf.base_ccy,
  SUM(CASE WHEN pos.status='CLOSED' THEN pos.pnl ELSE 0 END) as realized_pnl,
  SUM(CASE WHEN pos.status='OPEN' THEN pos.pnl ELSE 0 END) as unrealized_pnl,
  COUNT(CASE WHEN pos.status='OPEN' THEN 1 END) as open_positions,
  COUNT(CASE WHEN pos.status='CLOSED' THEN 1 END) as closed_positions
FROM portfolios pf
LEFT JOIN positions pos ON pos.portfolio_id = pf.id
WHERE pf.user_id = auth.uid()
GROUP BY pf.id, pf.name, pf.base_ccy;