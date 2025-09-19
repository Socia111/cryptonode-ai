// Type-safe signal queries with runtime validation
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import { typedSupabase } from '@/lib/supabaseClient';

// Type aliases for cleaner code
type Signal = Database['public']['Tables']['signals']['Row'];
type SignalInsert = Database['public']['Tables']['signals']['Insert'];

// Runtime validation schemas
const SignalSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  timeframe: z.string(),
  direction: z.enum(['LONG', 'SHORT']),
  price: z.number().positive(),
  score: z.number().min(0).max(100),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  is_active: z.boolean().nullable(),
  source: z.string().nullable(),
  algo: z.string().nullable(),
});

// Public DTO - slim interface for UI
export type SignalDTO = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  score: number;
  created_at: string;
  expires_at: string | null;
  is_active: boolean | null;
  source: string | null;
  algo: string | null;
};

// Type-safe query for live signals
export async function getLiveSignals(options?: {
  limit?: number;
  minScore?: number;
  symbol?: string;
  timeframe?: string;
}): Promise<SignalDTO[]> {
  const { limit = 100, minScore, symbol, timeframe } = options ?? {};
  
  // Build query immutably to avoid union type hell
  let query = typedSupabase
    .from('signals')
    .select('id,symbol,timeframe,direction,price,score,created_at,expires_at,is_active,source,algo')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  
  // Apply optional filters
  if (minScore !== undefined) query = query.gte('score', minScore);
  if (symbol) query = query.eq('symbol', symbol);
  if (timeframe) query = query.eq('timeframe', timeframe);
  
  const { data, error } = await query.limit(limit);
  
  if (error) throw error;
  
  // Convert to component types with validation
  const signals = (data ?? []).map(signal => {
    const parsed = SignalSchema.safeParse(signal);
    if (!parsed.success) {
      console.warn('[signals] Skipping invalid signal:', parsed.error);
      return null;
    }
    return parsed.data;
  }).filter((signal): signal is any => signal !== null);
  
  return signals as SignalDTO[];
}

// Type-safe query for signal by ID
export async function getSignalById(id: string): Promise<SignalDTO | null> {
  const { data, error } = await typedSupabase
    .from('signals')
    .select('id,symbol,timeframe,direction,price,score,created_at,expires_at,is_active,source,algo')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  if (!data) return null;
  
  const parsed = SignalSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[signals] Validation failed for single signal:', parsed.error);
    throw new Error('Invalid signal payload from database');
  }
  
  return parsed.data as SignalDTO;
}

// Type-safe signals by symbol
export async function getSignalsBySymbol(
  symbol: string, 
  options?: { limit?: number; activeOnly?: boolean }
): Promise<SignalDTO[]> {
  const { limit = 50, activeOnly = true } = options ?? {};
  
  let query = typedSupabase
    .from('signals')
    .select('id,symbol,timeframe,direction,price,score,created_at,expires_at,is_active,source,algo')
    .eq('symbol', symbol)
    .order('created_at', { ascending: false });
  
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query.limit(limit);
  
  if (error) throw error;
  
  const parsed = SignalSchema.array().safeParse(data ?? []);
  if (!parsed.success) {
    console.error('[signals] Validation failed:', parsed.error);
    throw new Error('Invalid signals payload from database');
  }
  
  return parsed.data as SignalDTO[];
}

// Export types for use in other modules
export type { Signal, SignalInsert };