-- Optional: queue schema hardening
ALTER TABLE execution_queue
  ADD COLUMN IF NOT EXISTS attempts int4 DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE INDEX IF NOT EXISTS execution_queue_status_idx ON execution_queue (status);
CREATE INDEX IF NOT EXISTS execution_queue_locked_idx ON execution_queue (locked_at);

-- Function to atomically claim jobs using SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_execution_jobs(p_limit int DEFAULT 50)
RETURNS SETOF execution_queue
LANGUAGE plpgsql
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

-- Function to release job as completed
CREATE OR REPLACE FUNCTION public.complete_execution_job(p_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE execution_queue
     SET status = 'completed',
         locked_at = NULL
   WHERE id = p_id;
$$;

-- Function to release job as error + retain message
CREATE OR REPLACE FUNCTION public.fail_execution_job(p_id uuid, p_error text)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE execution_queue
     SET status = 'error',
         locked_at = NULL,
         last_error = p_error
   WHERE id = p_id;
$$;

-- Function to requeue stale 'processing' jobs older than 15 minutes
CREATE OR REPLACE FUNCTION public.requeue_stale_jobs()
RETURNS int
LANGUAGE sql
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