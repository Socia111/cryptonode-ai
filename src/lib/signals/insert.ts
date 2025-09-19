import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

export type InsertResult =
  | { ok: true; id?: string; kind: 'inserted' }
  | { ok: true; kind: 'skipped_cooldown' }
  | { ok: false; kind: 'failed'; error: PostgrestError | Error };

function isPostgrestError(e: unknown): e is PostgrestError {
  return !!e && typeof e === 'object' && 'message' in e && 'code' in e;
}

function isCooldown(e: PostgrestError | Error): boolean {
  const msg = (e as any)?.message?.toLowerCase?.() || '';
  const code = (e as any)?.code;
  return code === '23505' || msg.includes('cooldown');
}

/**
 * Logs cooldown as info, hard failures as error.
 */
export function handleSignalInsertError(
  error: PostgrestError | Error,
  payload: any,
  logger: Pick<Console, 'log' | 'warn' | 'error'> = console
): InsertResult {
  if (isCooldown(error)) {
    logger.log(
      `[signals] cooldown skip ${payload?.symbol}/${payload?.timeframe}/${payload?.direction} ` +
      `[${payload?.source}/${payload?.algo}]`
    );
    return { ok: true, kind: 'skipped_cooldown' };
  }
  logger.error('[signals] insert failed', { error, symbol: payload?.symbol, timeframe: payload?.timeframe });
  return { ok: false, kind: 'failed', error };
}

/**
 * Insert with cooldown handling.
 * Optionally uses UPSERT with onConflict to avoid race conditions when you have a unique index.
 */
export async function safeSignalInsert(
  supabase: SupabaseClient,
  payload: any,
  opts?: {
    useUpsert?: boolean;
    onConflict?: string; // e.g. "symbol,timeframe,direction,source,algo,created_bucket"
    ignoreDuplicates?: boolean; // default true
    selectId?: boolean; // default true
  }
): Promise<InsertResult> {
  const { useUpsert = false, onConflict, ignoreDuplicates = true, selectId = true } = opts ?? {};

  try {
    let error: PostgrestError | null = null;
    let id: string | undefined;

    if (useUpsert) {
      // requires a matching unique index on onConflict columns
      if (selectId) {
        const { data, error: err } = await supabase
          .from('signals')
          .upsert(payload, { onConflict, ignoreDuplicates })
          .select('id')
          .single();
        error = err ?? null;
        id = data?.id;
      } else {
        const { error: err } = await supabase
          .from('signals')
          .upsert(payload, { onConflict, ignoreDuplicates });
        error = err ?? null;
      }
    } else {
      // simple insert; 23505 handled via trigger/constraint
      if (selectId) {
        const { data, error: err } = await supabase
          .from('signals')
          .insert(payload)
          .select('id')
          .single();
        error = err ?? null;
        id = data?.id;
      } else {
        const { error: err } = await supabase
          .from('signals')
          .insert(payload);
        error = err ?? null;
      }
    }

    if (error) return handleSignalInsertError(error, payload);

    return { ok: true, kind: 'inserted', id };
  } catch (e: any) {
    // Network or unexpected runtime error
    if (isPostgrestError(e)) return handleSignalInsertError(e, payload);
    console.error('[signals] unexpected insert error', e);
    return { ok: false, kind: 'failed', error: e };
  }
}

/**
 * Batch insert with bounded concurrency and cooldown handling.
 */
export async function safeBatchSignalInsert(
  supabase: SupabaseClient,
  payloads: any[],
  opts?: {
    concurrency?: number;
    upsert?: { onConflict: string; ignoreDuplicates?: boolean };
    onProgress?: (stats: { i: number; inserted: number; skipped: number; failed: number }) => void;
  }
): Promise<{ inserted: number; skipped: number; failed: number }> {
  const concurrency = Math.max(1, opts?.concurrency ?? 8);
  let i = 0, inserted = 0, skipped = 0, failed = 0;

  async function worker() {
    while (i < payloads.length) {
      const idx = i++;
      const p = payloads[idx];
      const res = await safeSignalInsert(supabase, p, opts?.upsert
        ? { useUpsert: true, onConflict: opts.upsert.onConflict, ignoreDuplicates: opts.upsert.ignoreDuplicates }
        : undefined
      );
      if (res.ok && res.kind === 'inserted') inserted++;
      else if (res.ok && res.kind === 'skipped_cooldown') skipped++;
      else failed++;

      opts?.onProgress?.({ i: idx + 1, inserted, skipped, failed });
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, payloads.length) }, () => worker());
  await Promise.all(runners);

  return { inserted, skipped, failed };
}