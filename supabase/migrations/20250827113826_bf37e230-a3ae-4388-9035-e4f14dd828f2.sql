-- Create the production-ready AItradeX1 scanner schema

-- Signals table (immutable)
CREATE TABLE IF NOT EXISTS signals (
  id BIGSERIAL PRIMARY KEY,
  algo TEXT NOT NULL DEFAULT 'AItradeX1',
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG','SHORT')),
  bar_time TIMESTAMPTZ NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  atr DOUBLE PRECISION,
  sl DOUBLE PRECISION,
  tp DOUBLE PRECISION,
  hvp DOUBLE PRECISION,
  filters JSONB NOT NULL,
  indicators JSONB NOT NULL,
  relaxed_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exchange, symbol, timeframe, direction, bar_time)
);

-- Enable RLS for signals
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

-- Create policy for signals
CREATE POLICY "Anyone can view signals" ON signals FOR SELECT USING (true);
CREATE POLICY "Service role can manage signals" ON signals FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Index for performance
CREATE INDEX IF NOT EXISTS signals_idx ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS signals_symbol_idx ON signals(symbol, timeframe, created_at DESC);

-- Dedupe/last emission state per key
CREATE TABLE IF NOT EXISTS signals_state (
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL,
  last_emitted TIMESTAMPTZ NOT NULL,
  last_price DOUBLE PRECISION,
  last_score DOUBLE PRECISION,
  PRIMARY KEY (exchange, symbol, timeframe, direction)
);

-- Enable RLS for signals_state
ALTER TABLE signals_state ENABLE ROW LEVEL SECURITY;

-- Create policy for signals_state
CREATE POLICY "Service role can manage signals state" ON signals_state FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Deliveries (outbound)
CREATE TABLE IF NOT EXISTS alerts_log (
  id BIGSERIAL PRIMARY KEY,
  signal_id BIGINT REFERENCES signals(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- telegram | webhook | discord
  payload JSONB NOT NULL,
  status TEXT NOT NULL, -- sent | failed
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for alerts_log
ALTER TABLE alerts_log ENABLE ROW LEVEL SECURITY;

-- Create policy for alerts_log
CREATE POLICY "Service role can manage alerts log" ON alerts_log FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Errors/diagnostics
CREATE TABLE IF NOT EXISTS errors_log (
  id BIGSERIAL PRIMARY KEY,
  where_at TEXT NOT NULL,
  symbol TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for errors_log
ALTER TABLE errors_log ENABLE ROW LEVEL SECURITY;

-- Create policy for errors_log
CREATE POLICY "Service role can manage errors log" ON errors_log FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Scanning runs
CREATE TABLE IF NOT EXISTS scans (
  id BIGSERIAL PRIMARY KEY,
  exchange TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  symbols_count INT,
  signals_count INT,
  relaxed_mode BOOLEAN DEFAULT FALSE
);

-- Enable RLS for scans
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Create policy for scans
CREATE POLICY "Anyone can view scans" ON scans FOR SELECT USING (true);
CREATE POLICY "Service role can manage scans" ON scans FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);