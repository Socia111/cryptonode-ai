// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// If you call a protected executor, consider using SERVICE_ROLE for server-to-server.
// For safety here we stick to anon and call a public edge function.
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const BATCH_LIMIT = 50; // jobs per run
const MAX_PARALLEL = 8; // concurrent executor calls

async function claimJobs(limit = BATCH_LIMIT) {
  const { data, error } = await sb.rpc("claim_execution_jobs", { p_limit: limit });
  if (error) throw new Error(`claim_execution_jobs failed: ${error.message}`);
  return data as any[];
}

async function completeJob(id: string) {
  const { error } = await sb.rpc("complete_execution_job", { p_id: id });
  if (error) throw new Error(`complete_execution_job failed: ${error.message}`);
}

async function failJob(id: string, message: string) {
  const { error } = await sb.rpc("fail_execution_job", { p_id: id, p_error: message.slice(0, 2000) });
  if (error) throw new Error(`fail_execution_job failed: ${error.message}`);
}

// Call your existing executor edge function with the job payload
async function runExecutor(job: any) {
  // Load the signal row (if not embedded)
  let signal = job.signal;
  if (!signal && job.signal_id) {
    const { data, error } = await sb
      .from("signals")
      .select("*")
      .eq("id", job.signal_id)
      .single();
    if (error) throw new Error(`load signal failed: ${error.message}`);
    signal = data;
  }

  // Call automated-trading-executor
  const res = await fetch(`${SUPABASE_URL}/functions/v1/automated-trading-executor`, {
    method: "POST",
    headers: { "content-type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ signal, queue_id: job.id })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`automated-trading-executor ${res.status}: ${txt}`);
  }
}

async function requeueStale() {
  const { data, error } = await sb.rpc("requeue_stale_jobs");
  if (error) {
    await sb.from("edge_event_log").insert({ fn: "auto-exec-worker", stage: "requeue_error", payload: { message: error.message } }).catch(() => {});
    return 0;
  }
  return (data as number) ?? 0;
}

async function processBatch() {
  const jobs = await claimJobs(BATCH_LIMIT);
  if (!jobs?.length) return { claimed: 0, ok: 0, failed: 0 };

  let ok = 0, failed = 0;
  // Simple concurrency limiter
  const pool: Promise<void>[] = [];
  for (const job of jobs) {
    const task = (async () => {
      try {
        await runExecutor(job);
        await completeJob(job.id);
        ok++;
      } catch (e: any) {
        await failJob(job.id, e?.message ?? "unknown error");
        failed++;
        await sb.from("edge_event_log").insert({
          fn: "auto-exec-worker",
          stage: "job_error",
          payload: { job_id: job.id, message: e?.message }
        }).catch(() => {});
      }
    })();

    pool.push(task);
    if (pool.length >= MAX_PARALLEL) {
      await Promise.race(pool);
      // remove settled
      for (let i = pool.length - 1; i >= 0; i--) {
        if ((pool[i] as any).status === "fulfilled" || (pool[i] as any).status === "rejected") {
          pool.splice(i, 1);
        }
      }
    }
  }
  await Promise.allSettled(pool);
  return { claimed: jobs.length, ok, failed };
}

serve(async () => {
  try {
    const recycled = await requeueStale();
    const res = await processBatch();
    await sb.from("edge_event_log").insert({
      fn: "auto-exec-worker",
      stage: "batch_done",
      payload: { recycled, ...res }
    }).catch(() => {});
    return new Response(JSON.stringify({ recycled, ...res }), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    await sb.from("edge_event_log").insert({
      fn: "auto-exec-worker",
      stage: "fatal",
      payload: { message: e?.message }
    }).catch(() => {});
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
});