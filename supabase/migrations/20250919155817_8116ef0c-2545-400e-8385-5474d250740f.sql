-- Backfill null grades in signals table
UPDATE signals
   SET metadata = COALESCE(metadata, '{}') || '{"grade": "C"}'
 WHERE metadata IS NULL 
    OR NOT (metadata ? 'grade')
    OR (metadata->>'grade') IS NULL;

-- Create trigger to enforce default grade on signals
CREATE OR REPLACE FUNCTION public.trig_signals_default_grade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Ensure metadata exists
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}';
  END IF;
  
  -- Set default grade if missing
  IF NOT (NEW.metadata ? 'grade') OR (NEW.metadata->>'grade') IS NULL THEN
    NEW.metadata := NEW.metadata || '{"grade": "C"}';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_grade ON signals;
CREATE TRIGGER trg_default_grade
BEFORE INSERT OR UPDATE ON signals
FOR EACH ROW
EXECUTE FUNCTION public.trig_signals_default_grade();

-- Fix search_path for all functions created in previous migration
CREATE OR REPLACE FUNCTION public.claim_execution_jobs(p_limit int DEFAULT 50)
RETURNS SETOF execution_queue
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT id
    FROM execution_queue
    WHERE status = 'queued'
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE execution_queue q
     SET status = 'processing',
         locked_at = now(),
         attempts = q.attempts + 1
  FROM cte
  WHERE q.id = cte.id
  RETURNING q.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_execution_job(p_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE execution_queue
     SET status = 'completed',
         locked_at = NULL
   WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.fail_execution_job(p_id uuid, p_error text)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE execution_queue
     SET status = 'error',
         locked_at = NULL,
         last_error = p_error
   WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.requeue_stale_jobs()
RETURNS int
LANGUAGE sql
SET search_path = public
AS $$
  WITH upd AS (
    UPDATE execution_queue
       SET status = 'queued',
           locked_at = NULL
     WHERE status = 'processing'
       AND locked_at < now() - interval '15 minutes'
     RETURNING 1
  )
  SELECT count(*)::int FROM upd;
$$;