-- Comprehensive signals system hardening - Part 1
-- Security and performance optimizations

-- 1) Clean up RLS (public read, service-only writes)
DROP POLICY IF EXISTS "Signals are publicly readable" ON signals;
DROP POLICY IF EXISTS "signals_read_policy" ON signals;
DROP POLICY IF EXISTS "Public read access to signals" ON signals;
DROP POLICY IF EXISTS "signals_insert_policy" ON signals;

-- Single public read of *live* signals only
CREATE POLICY "public-read-live"
ON signals
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- Block direct client writes; allow only service role
CREATE POLICY "service-only-mutate"
ON signals
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2) Schema guardrails (NOT NULL, CHECK constraints)
ALTER TABLE signals
  ALTER COLUMN symbol SET NOT NULL,
  ALTER COLUMN timeframe SET NOT NULL,
  ALTER COLUMN direction SET NOT NULL,
  ALTER COLUMN price SET NOT NULL,
  ALTER COLUMN score SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT now();

-- Add constraints for data integrity
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE signals DROP CONSTRAINT chk_direction;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE signals DROP CONSTRAINT chk_score;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE signals DROP CONSTRAINT chk_prices;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;
END $$;

ALTER TABLE signals
  ADD CONSTRAINT chk_direction CHECK (direction IN ('LONG','SHORT')),
  ADD CONSTRAINT chk_score CHECK (score BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_prices CHECK (
    price > 0
    AND (entry_price IS NULL OR entry_price > 0)
    AND (stop_loss IS NULL OR stop_loss > 0)
    AND (take_profit IS NULL OR take_profit > 0)
  );

-- Set default expiry and update existing records
UPDATE signals SET expires_at = created_at + INTERVAL '6 hours' WHERE expires_at IS NULL;

-- 3) Cooldown enforcement function
CREATE OR REPLACE FUNCTION enforce_signal_cooldown()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM signals s
    WHERE s.symbol = NEW.symbol
      AND s.timeframe = NEW.timeframe
      AND s.direction = NEW.direction
      AND s.source = NEW.source
      AND s.algo = NEW.algo
      AND s.created_at >= now() - INTERVAL '2 hours'
      AND s.is_active = true
  ) THEN
    RAISE EXCEPTION 'Cooldown: recent % % signal exists for % [%/%]',
      NEW.direction, NEW.timeframe, NEW.symbol, NEW.source, NEW.algo
      USING errcode = '23505';
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_signal_cooldown ON signals;
CREATE TRIGGER trg_signal_cooldown
BEFORE INSERT ON signals
FOR EACH ROW EXECUTE FUNCTION enforce_signal_cooldown();

-- 4) Performance indexes
DROP INDEX IF EXISTS idx_signals_live;
DROP INDEX IF EXISTS idx_signals_score_created;
DROP INDEX IF EXISTS idx_signals_symbol_tf_time;
DROP INDEX IF EXISTS idx_signals_source_algo_time;
DROP INDEX IF EXISTS idx_signals_exchange_time;

-- Recent live signals (most UIs)
CREATE INDEX idx_signals_live
ON signals(is_active, expires_at, created_at DESC);

CREATE INDEX idx_signals_score_created
ON signals(score DESC, created_at DESC)
WHERE is_active = true;

-- Per symbol/timeframe pages
CREATE INDEX idx_signals_symbol_tf_time
ON signals(symbol, timeframe, created_at DESC);

-- Source/algo filter chips
CREATE INDEX idx_signals_source_algo_time
ON signals(source, algo, created_at DESC);

-- Exchange filtering
CREATE INDEX idx_signals_exchange_time
ON signals(exchange, created_at DESC);

-- 5) TTL & housekeeping functions
CREATE OR REPLACE FUNCTION expire_signals() RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE signals
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= now();
END$$;

-- Archive table for old signals
CREATE TABLE IF NOT EXISTS signals_archive (LIKE signals INCLUDING ALL);

CREATE OR REPLACE FUNCTION archive_signals(days INT DEFAULT 7) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO signals_archive
  SELECT * FROM signals
  WHERE created_at < now() - (days || ' days')::INTERVAL;

  DELETE FROM signals
  WHERE created_at < now() - (days || ' days')::INTERVAL;
END$$;