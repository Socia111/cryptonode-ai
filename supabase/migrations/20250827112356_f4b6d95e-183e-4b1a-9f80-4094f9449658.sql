-- Phase 1: Database Schema Upgrade
-- Enhance scanner_signals table with canonical AItradeX1 fields
ALTER TABLE scanner_signals 
ADD COLUMN IF NOT EXISTS algo text DEFAULT 'AItradeX1',
ADD COLUMN IF NOT EXISTS bar_time timestamptz,
ADD COLUMN IF NOT EXISTS atr numeric,
ADD COLUMN IF NOT EXISTS sl numeric,
ADD COLUMN IF NOT EXISTS tp numeric,
ADD COLUMN IF NOT EXISTS hvp numeric,
ADD COLUMN IF NOT EXISTS filters jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Update existing records to have bar_time
UPDATE scanner_signals SET bar_time = generated_at WHERE bar_time IS NULL;

-- Add unique constraint for deduplication
ALTER TABLE scanner_signals DROP CONSTRAINT IF EXISTS unique_signal_bar;
ALTER TABLE scanner_signals ADD CONSTRAINT unique_signal_bar 
UNIQUE (exchange, symbol, timeframe, direction, bar_time);

-- Create eval_logs table for diagnostics
CREATE TABLE IF NOT EXISTS eval_logs (
  id bigserial primary key,
  exchange text not null,
  symbol text not null,
  timeframe text not null,
  bar_time timestamptz not null,
  filters jsonb not null,
  score numeric not null,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS eval_logs_ix ON eval_logs(exchange, symbol, timeframe, bar_time desc);

-- Create subscribers table for routing
CREATE TABLE IF NOT EXISTS subscribers (
  id bigserial primary key,
  user_id uuid,
  channel text not null check (channel in ('telegram','discord','webhook','email')),
  target text not null,   -- telegram chat id, webhook URL, etc.
  min_score numeric default 0,
  only_direction text null check (only_direction in ('LONG','SHORT') or only_direction is null),
  active boolean default true,
  created_at timestamptz default now()
);

-- Create configs table for versioning
CREATE TABLE IF NOT EXISTS configs (
  id bigserial primary key,
  name text not null,
  payload jsonb not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Insert canonical AItradeX1 config
INSERT INTO configs (name, payload, is_active) VALUES (
  'AItradeX1',
  '{
    "name": "AItradeX1",
    "version": "1.0.0",
    "inputs": {
      "emaLen": 21,
      "smaLen": 200,
      "adxThreshold": 28,
      "stochLength": 14,
      "stochSmoothK": 3,
      "stochSmoothD": 3,
      "volSpikeMult": 1.7,
      "obvEmaLen": 21,
      "hvpLower": 55,
      "hvpUpper": 85,
      "breakoutLen": 5,
      "spreadMaxPct": 0.10,
      "atrLen": 14,
      "exitBars": 18,
      "useDailyTrendFilter": true
    },
    "relaxedMode": {
      "adxThreshold": 22,
      "volSpikeMult": 1.4,
      "hvpLower": 50,
      "hvpUpper": 90,
      "breakoutLen": 3,
      "useDailyTrendFilter": false
    },
    "scoreBuckets": ["trend","adx","dmi","stoch","volume","obv","hvp","spread"]
  }',
  true
)
ON CONFLICT DO NOTHING;