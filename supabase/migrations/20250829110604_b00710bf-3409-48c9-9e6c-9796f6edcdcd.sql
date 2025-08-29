-- Fix the signals table constraint and add upsert capability
-- First, let's see if we can modify the constraint to be more flexible

-- Create or replace function to handle signal upserts
CREATE OR REPLACE FUNCTION upsert_signal(
  p_exchange text,
  p_symbol text,
  p_timeframe text,
  p_direction text,
  p_bar_time timestamp with time zone,
  p_signal_data jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signal_id uuid;
BEGIN
  -- Try to insert, on conflict update the existing record
  INSERT INTO signals (
    exchange, symbol, timeframe, direction, bar_time,
    entry_price, stop_loss, take_profit, confidence_score,
    signal_strength, risk_level, metadata, generated_at
  ) VALUES (
    p_exchange, p_symbol, p_timeframe, p_direction, p_bar_time,
    (p_signal_data->>'entry_price')::numeric,
    (p_signal_data->>'stop_loss')::numeric,
    (p_signal_data->>'take_profit')::numeric,
    (p_signal_data->>'confidence_score')::numeric,
    COALESCE(p_signal_data->>'signal_strength', 'MEDIUM'),
    COALESCE(p_signal_data->>'risk_level', 'MEDIUM'),
    p_signal_data,
    now()
  )
  ON CONFLICT (exchange, symbol, timeframe, direction, bar_time)
  DO UPDATE SET
    entry_price = EXCLUDED.entry_price,
    stop_loss = EXCLUDED.stop_loss,
    take_profit = EXCLUDED.take_profit,
    confidence_score = EXCLUDED.confidence_score,
    signal_strength = EXCLUDED.signal_strength,
    risk_level = EXCLUDED.risk_level,
    metadata = EXCLUDED.metadata,
    generated_at = now(),
    status = 'active'
  RETURNING id INTO signal_id;
  
  RETURN signal_id;
END;
$$;