-- Create execution_queue table first
CREATE TABLE IF NOT EXISTS public.execution_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id uuid,
  user_id uuid,
  symbol text NOT NULL,
  side text NOT NULL,
  amount_usd numeric NOT NULL,
  leverage integer DEFAULT 1,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'error')),
  signal jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  attempts int4 DEFAULT 0,
  locked_at timestamptz,
  last_error text
);

-- Enable RLS
ALTER TABLE public.execution_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role can manage execution queue" 
ON public.execution_queue 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own execution queue" 
ON public.execution_queue 
FOR SELECT 
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS execution_queue_status_idx ON execution_queue (status);
CREATE INDEX IF NOT EXISTS execution_queue_locked_idx ON execution_queue (locked_at);
CREATE INDEX IF NOT EXISTS execution_queue_user_idx ON execution_queue (user_id);
CREATE INDEX IF NOT EXISTS execution_queue_signal_idx ON execution_queue (signal_id);

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