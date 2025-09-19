// Type-safe error handling utilities
import type { PostgrestError } from '@supabase/supabase-js';

// Type guard for PostgrestError
export function isPostgrestError(e: unknown): e is PostgrestError {
  return !!e && typeof e === 'object' && 'code' in e && 'message' in e;
}

// Type guard for cooldown errors
export function isCooldownError(e: PostgrestError | Error): boolean {
  const msg = (e as any)?.message?.toLowerCase?.() || '';
  const code = (e as any)?.code;
  return code === '23505' || msg.includes('cooldown');
}

// Enhanced error handler with structured logging
export function handleDatabaseError(
  error: unknown,
  context: { operation: string; table?: string; payload?: any },
  logger: Pick<Console, 'log' | 'warn' | 'error'> = console
): never {
  if (isPostgrestError(error)) {
    if (isCooldownError(error)) {
    logger.log(
      `[${context.table || 'db'}] cooldown skip for ${context.operation}`,
      { code: error.code, message: error.message }
    );
    // Don't throw for cooldowns - let caller handle gracefully
    return undefined as never;
    }
    
    logger.error(
      `[${context.table || 'db'}] ${context.operation} failed`,
      { 
        code: error.code, 
        message: error.message, 
        hint: error.hint,
        details: error.details 
      }
    );
    throw new Error(`Database ${context.operation} failed: ${error.message}`);
  }
  
  logger.error(`[${context.table || 'db'}] unexpected error in ${context.operation}`, error);
  throw new Error(`Unexpected error in ${context.operation}`);
}

// Wrapper for safe database operations
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  context: { operation: string; table?: string; payload?: any }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleDatabaseError(error, context);
    throw error; // TypeScript doesn't know handleDatabaseError never returns
  }
}