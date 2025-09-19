# Type Safety Implementation Guide

## Overview

Project 2 now includes enhanced type safety for Supabase operations while maintaining backward compatibility. This guide explains the new type-safe utilities and best practices.

## Key Components

### 1. Dual Supabase Clients

```typescript
// Backward compatible (existing code)
import { supabase } from '@/lib/supabaseClient';

// Type-safe for new code
import { typedSupabase } from '@/lib/supabaseClient';
```

### 2. Type-Safe Signal Operations

```typescript
import { safeSignalInsert, safeBatchSignalInsert } from '@/lib/signals/insert';
import { getLiveSignals, getSignalById } from '@/lib/queries/signals';

// Safe insert with cooldown handling
const result = await safeSignalInsert(supabase, payload);
if (result.ok && result.kind === 'inserted') {
  console.log('Signal inserted:', result.id);
} else if (result.ok && result.kind === 'skipped_cooldown') {
  console.log('Cooldown skip - no error');
} else {
  console.error('Insert failed:', result.error);
}

// Type-safe queries with runtime validation
const signals = await getLiveSignals({ limit: 50, minScore: 80 });
```

### 3. Error Handling

```typescript
import { isPostgrestError, isCooldownError, handleDatabaseError } from '@/lib/errors';

try {
  await someDbOperation();
} catch (error) {
  if (isPostgrestError(error) && isCooldownError(error)) {
    // Handle cooldown gracefully
    console.log('Cooldown triggered - skipping');
    return;
  }
  
  handleDatabaseError(error, { 
    operation: 'insert_signal', 
    table: 'signals',
    payload: signalData 
  });
}
```

### 4. Type Adapters

For components that need to bridge database types and UI types:

```typescript
import { adaptSignalFromDb, adaptTradingAccountFromDb } from '@/lib/types/adapters';

// Convert DB row to component-safe type
const componentSignal = adaptSignalFromDb(dbSignal);
const componentAccount = adaptTradingAccountFromDb(dbAccount);
```

## Best Practices

### 1. Query Building

```typescript
// ✅ Build queries immutably
let query = typedSupabase
  .from('signals')
  .select('id,symbol,price,score')
  .order('created_at', { ascending: false });

if (minScore) query = query.gte('score', minScore);
if (symbol) query = query.eq('symbol', symbol);

const { data, error } = await query.limit(100);
```

### 2. Runtime Validation

```typescript
import { z } from 'zod';

const SignalSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  direction: z.enum(['LONG', 'SHORT']),
  price: z.number().positive(),
});

const validated = SignalSchema.safeParse(data);
if (!validated.success) {
  console.error('Validation failed:', validated.error);
  return;
}
```

### 3. Cooldown Handling

```typescript
// ✅ Treat 23505 as info, not error
const result = await safeSignalInsert(supabase, payload);
// Cooldowns are logged as info and return ok: true, kind: 'skipped_cooldown'
// Only real failures return ok: false
```

## Migration Strategy

1. **Existing Code**: Continues working unchanged with the regular `supabase` client
2. **New Features**: Use `typedSupabase` and the type-safe helpers
3. **Gradual Migration**: Replace queries one by one using the adapter functions

## Error Categories

- **Cooldown (23505)**: Logged as info, treated as successful skip
- **PostgreSQL Errors**: Logged with structured context
- **Network Errors**: Logged with operation context
- **Validation Errors**: Logged with specific field failures

## Files Added

- `src/lib/queries/signals.ts` - Type-safe signal queries
- `src/lib/errors.ts` - Enhanced error handling utilities  
- `src/lib/types/adapters.ts` - Type conversion helpers
- `src/lib/signals/insert.ts` - Enhanced with type safety

## TypeScript Config Recommendations

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strictNullChecks": true
  }
}
```

This implementation provides rock-solid type safety while keeping the existing codebase functional during the transition period.