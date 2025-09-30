-- Phase 2: Restore Database Functions & Triggers for Automated Trading

-- Function: Auto-execute high-confidence signals
CREATE OR REPLACE FUNCTION trigger_automated_trading()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-execute if score >= 75 and auto-trading is enabled
  IF NEW.score >= 75 AND NEW.is_active = true THEN
    -- Insert into execution queue
    INSERT INTO execution_queue (
      signal_id,
      symbol,
      side,
      amount_usd,
      leverage,
      signal,
      status,
      metadata
    ) VALUES (
      NEW.id,
      NEW.symbol,
      COALESCE(NEW.side, CASE WHEN NEW.direction = 'LONG' THEN 'BUY' ELSE 'SELL' END),
      100,
      1,
      to_jsonb(NEW),
      'queued',
      jsonb_build_object('auto_triggered', true, 'score', NEW.score)
    );
    
    RAISE LOG 'Auto-trading triggered for signal % (% @ %)', NEW.id, NEW.symbol, NEW.score;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: Claim execution jobs for processing
CREATE OR REPLACE FUNCTION claim_execution_jobs(worker_id text, max_jobs int DEFAULT 5)
RETURNS SETOF execution_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE execution_queue
  SET 
    status = 'processing',
    locked_at = now(),
    metadata = metadata || jsonb_build_object('worker_id', worker_id)
  WHERE id IN (
    SELECT id FROM execution_queue
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT max_jobs
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Function: Complete execution job
CREATE OR REPLACE FUNCTION complete_execution_job(
  job_id uuid,
  success boolean,
  result_data jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE execution_queue
  SET 
    status = CASE WHEN success THEN 'completed' ELSE 'failed' END,
    metadata = metadata || result_data,
    updated_at = now()
  WHERE id = job_id;
  
  -- If successful, mark signal as executed
  IF success THEN
    UPDATE signals
    SET 
      is_active = false,
      metadata = metadata || jsonb_build_object('executed_at', now(), 'job_id', job_id)
    WHERE id = (SELECT signal_id FROM execution_queue WHERE id = job_id);
  END IF;
END;
$$;

-- Function: Cleanup old signals
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Deactivate expired signals
  UPDATE signals
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();
    
  -- Archive signals older than 7 days
  INSERT INTO signals_archive
  SELECT * FROM signals
  WHERE created_at < now() - interval '7 days'
  ON CONFLICT (id) DO NOTHING;
  
  DELETE FROM signals
  WHERE created_at < now() - interval '7 days';
  
  RAISE LOG 'Cleaned up old signals';
END;
$$;

-- Trigger: Auto-execute on new signals
DROP TRIGGER IF EXISTS trigger_auto_trading ON signals;
CREATE TRIGGER trigger_auto_trading
  AFTER INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_automated_trading();

-- Trigger: Validate signal data
CREATE OR REPLACE FUNCTION validate_signal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure required fields are present
  IF NEW.symbol IS NULL OR NEW.direction IS NULL OR NEW.price IS NULL THEN
    RAISE EXCEPTION 'Signal missing required fields';
  END IF;
  
  -- Set default values
  NEW.is_active := COALESCE(NEW.is_active, true);
  NEW.score := COALESCE(NEW.score, 50);
  NEW.confidence := COALESCE(NEW.confidence, NEW.score / 100.0);
  
  -- Set expiration if not provided
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + interval '24 hours';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_signal_trigger ON signals;
CREATE TRIGGER validate_signal_trigger
  BEFORE INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION validate_signal();

-- Log the restoration
INSERT INTO edge_event_log (fn, stage, payload)
VALUES (
  'database_restoration', 
  'completed', 
  jsonb_build_object(
    'phase', 'automated_trading_functions',
    'timestamp', now()
  )
);