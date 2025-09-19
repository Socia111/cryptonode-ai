import { PostgrestError } from '@supabase/supabase-js';

/**
 * Handle signal insert errors gracefully, especially cooldown violations
 */
export function handleSignalInsertError(error: any, payload: any): void {
  const pg = error as PostgrestError;
  
  // Check for cooldown constraint violation (23505)
  if (pg.code === '23505' || /Cooldown/.test(pg.message || '')) {
    console.log(`[signals] cooldown skip for ${payload.symbol}/${payload.timeframe}/${payload.direction}`);
    return; // Soft skip, not an error
  }
  
  // Re-throw other errors
  console.error('[signals] Insert error:', error);
  throw error;
}

/**
 * Safely insert signals with cooldown handling
 */
export async function safeSignalInsert(supabase: any, payload: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('signals')
      .insert(payload);

    if (error) {
      handleSignalInsertError(error, payload);
      return false; // Cooldown skip
    }
    
    return true; // Success
  } catch (err) {
    console.error('[signals] Unexpected error during insert:', err);
    return false;
  }
}

/**
 * Batch insert signals with cooldown handling
 */
export async function safeBatchSignalInsert(supabase: any, payloads: any[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  
  for (const payload of payloads) {
    const success = await safeSignalInsert(supabase, payload);
    if (success) {
      inserted++;
    } else {
      skipped++;
    }
  }
  
  return { inserted, skipped };
}