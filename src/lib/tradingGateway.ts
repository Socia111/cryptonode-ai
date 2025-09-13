import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/featureFlags';
import { tradingSettings } from './tradingSettings';

export type Side = 'Buy'|'Sell';
export type OrderType = 'Market'|'Limit';
export type OrderTIF = 'GTC'|'IOC'|'FOK'|'PostOnly';

export interface ExecParams {
  symbol: string;                 // "PEAQUSDT"
  side: Side;                     // 'Buy' | 'Sell'
  amountUSD: number;              // 0.10 ... 100
  leverage: number;               // 1 ... 100
  orderType?: OrderType;          // default 'Market'
  timeInForce?: OrderTIF;         // default 'PostOnly' for Limit
  price?: number;                 // Limit price (usually entry_price)
  // NEW: pass-through from signal panel (raw)
  uiEntry?: number;
  uiTP?: number;
  uiSL?: number;
  // Auto-exec fields
  stopLoss?: number;
  takeProfit?: number;
  // optional extras
  reduceOnly?: boolean;
  scalpMode?: boolean;
  meta?: Record<string, any>;
  // Deprecated fields for backward compatibility
  notionalUSD?: number;  // deprecated, use amountUSD
  entryPrice?: number;   // deprecated, use uiEntry
}

// Legacy interface for backward compatibility
export type LegacyExecParams = {
  symbol: string
  side: 'BUY'|'SELL'|'Buy'|'Sell'
  notionalUSD?: number
  amountUSD?: number
  leverage?: number
  scalpMode?: boolean
  entryPrice?: number
  stopLoss?: number
  takeProfit?: number
}

// Get the functions base URL using the hardcoded Supabase URL
function getFunctionsBaseUrl(): string {
  return 'https://codhlwjogfjywmjyjbbn.functions.supabase.co';
}

async function getSessionToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.warn('Failed to get session token:', error);
    return null;
  }
}

// Helper to normalize params from legacy format
function normalizeParams(params: ExecParams | LegacyExecParams): ExecParams {
  const normalized: ExecParams = {
    symbol: params.symbol,
    side: normalizeSide(params.side),
    amountUSD: params.amountUSD || (params as any).notionalUSD || 5,
    leverage: params.leverage || 1,
    scalpMode: params.scalpMode,
    // Map legacy fields to new UI fields
    uiEntry: (params as any).entryPrice || (params as ExecParams).uiEntry,
    uiTP: (params as any).takeProfit || (params as ExecParams).uiTP,
    uiSL: (params as any).stopLoss || (params as ExecParams).uiSL,
    // Auto-exec fields
    stopLoss: (params as ExecParams).stopLoss,
    takeProfit: (params as ExecParams).takeProfit,
  };

  // Copy any additional fields
  if ('orderType' in params) normalized.orderType = params.orderType;
  if ('timeInForce' in params) normalized.timeInForce = params.timeInForce;
  if ('price' in params) normalized.price = params.price;
  if ('reduceOnly' in params) normalized.reduceOnly = params.reduceOnly;
  if ('meta' in params) normalized.meta = params.meta;

  return normalized;
}

function normalizeSide(side: string): Side {
  if (side === 'BUY' || side === 'Buy') return 'Buy';
  if (side === 'SELL' || side === 'Sell') return 'Sell';
  throw new Error(`Invalid side: ${side}`);
}

export const TradingGateway = {
  async execute(inputParams: ExecParams | LegacyExecParams) {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, code: 'DISABLED', message: 'Auto-trading disabled' }
    }

    try {
      const params = normalizeParams(inputParams);
      console.log('🚀 Executing live trade via Bybit API:', params);
      
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      if (!sessionToken) {
        return { 
          ok: false, 
          code: 'AUTH_REQUIRED', 
          message: 'Please sign in to execute trades' 
        };
      }
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'authorization': `Bearer ${sessionToken}`,
      };
      
      // Dynamic minimum based on scalp mode
      const isScalping = params.scalpMode === true;
      const minAmount = isScalping ? 1 : 5; // $1 for scalping, $5 for normal
      const amount = Math.max(params.amountUSD, minAmount);
      const leverage = Math.max(params.leverage, 1);
      
      // Clean symbol format - remove any slashes or spaces
      const cleanSymbol = params.symbol.replace(/[\/\s]/g, '');
      
      console.log('🔧 Trade execution params:', {
        symbol: cleanSymbol,
        side: params.side,
        amountUSD: amount,
        leverage,
        scalpMode: isScalping,
        minAmount,
        functionsBase,
        uiEntry: params.uiEntry,
        uiTP: params.uiTP,
        uiSL: params.uiSL
      });
      
      // Get global trading settings
      const globalSettings = tradingSettings.getSettings();
      
      // Determine order type and price
      const entryPrice = params.uiEntry || params.price;
      const orderType = params.orderType || (entryPrice ? 'Limit' : globalSettings.orderType === 'limit' ? 'Limit' : 'Market');
      const timeInForce = params.timeInForce || (orderType === 'Limit' ? 'PostOnly' : 'GTC');
      
      // Generate idempotency key to avoid duplicates on retries
      const idempotencyKey = crypto.randomUUID();

      const response = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'place_order',
          symbol: cleanSymbol,
          side: params.side,
          amountUSD: amount,
          leverage: leverage,
          orderType,
          timeInForce,
          price: orderType === 'Limit' ? entryPrice : undefined,
          // Pass UI values for TP/SL attachment
          uiEntry: params.uiEntry,
          uiTP: params.uiTP,
          uiSL: params.uiSL,
          // Auto-exec TP/SL
          stopLoss: params.stopLoss,
          takeProfit: params.takeProfit,
          scalpMode: isScalping,
          reduceOnly: params.reduceOnly || false,
          testMode: true, // Always use testnet for now
          idempotencyKey,
          meta: params.meta
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        return { 
          ok: false, 
          code: 'HTTP_ERROR', 
          message: `HTTP ${response.status}: ${errorText}` 
        };
      }

      const data = await response.json();
      
      // Log the full response for debugging
      console.log('📊 Trade executor response:', {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!data.success && !data.ok) {
        console.error('❌ Trade execution failed:', data);
        const errorMessage = data?.error || data?.message || 'Unknown error';
        return { 
          ok: false, 
          code: 'TRADE_FAILED', 
          message: errorMessage,
          details: data?.details || 'No additional details'
        };
      }

      console.log('✅ Live trade executed successfully:', data);
      return { ok: true, data: data.data || data };
      
    } catch (error: any) {
      console.error('❌ Trading gateway error:', error);
      return { ok: false, code: 'NETWORK_ERROR', message: error.message };
    }
  },

  async getPositions() {
    try {
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(`${functionsBase}/bybit-live-trading`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'positions' })
      });

      const data = await response.json();
      return { ok: data.success, data: data.data };
      
    } catch (error: any) {
      console.error('❌ Error fetching positions:', error);
      return { ok: false, error: error.message };
    }
  },

  async getBalance() {
    try {
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(`${functionsBase}/bybit-live-trading`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'balance' })
      });

      const data = await response.json();
      return { ok: data.success, data: data.data };
      
    } catch (error: any) {
      console.error('❌ Error fetching balance:', error);
      return { ok: false, error: error.message };
    }
  },

  async bulkExecute(list: (ExecParams | LegacyExecParams)[]) {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, code: 'DISABLED', message: 'Auto-trading disabled' }
    }

    try {
      console.log('🚀 Queuing bulk trades:', list.length, 'orders');
      
      // Import trade queue here to avoid circular dependencies
      const { tradeQueue } = await import('./tradeQueue');
      
      const tradeIds = list.map(params => tradeQueue.addTrade(normalizeParams(params)));
      
      console.log(`📋 ${tradeIds.length} trades queued for execution`);

      return { 
        ok: true, 
        data: { 
          queued: tradeIds.length, 
          tradeIds,
          message: 'Trades queued for execution'
        }
      };
      
    } catch (error: any) {
      console.error('❌ Bulk trading error:', error);
      return { ok: false, code: 'BULK_ERROR', message: error.message };
    }
  },

  // Test function to check edge function connectivity
  async testConnection() {
    try {
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'status' })
      });

      if (!response.ok) {
        return { ok: false, status: response.status, statusText: response.statusText };
      }

      const data = await response.json();
      return { ok: true, data };
      
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }
}