import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/featureFlags';

export type OrderTIF = 'GTC' | 'IOC' | 'FOK' | 'PostOnly' | 'ImmediateOrCancel';
export type OrderType = 'Market' | 'Limit';

export interface ExecuteParams {
  symbol: string;
  side: 'Buy' | 'Sell';
  amountUSD: number;
  leverage: number;
  orderType?: OrderType;
  timeInForce?: OrderTIF;
  price?: number;
  scalpMode?: boolean;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  reduceOnly?: boolean;
  meta?: Record<string, any>;
}

export interface ExecResult {
  ok: boolean;
  message?: string;
  data?: any;
  error?: string;
  status?: number;
  code?: string;            // Keep optional for compatibility
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

export const TradingGateway = {
  async testConnection(): Promise<ExecResult> {
    try {
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
      
      const r = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'status' })
      });
      
      const data = await r.json().catch(() => ({}));
      return { 
        ok: r.ok, 
        status: r.status, 
        data, 
        message: data?.message, 
        error: data?.error 
      };
    } catch (error: any) {
      return { 
        ok: false, 
        error: error.message,
        message: 'Connection test failed'
      };
    }
  },

  async execute(params: ExecuteParams): Promise<ExecResult> {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, error: 'DISABLED', message: 'Auto-trading disabled' }
    }

    try {
      console.log('🧭 TradingGateway.execute IN:', params);
      
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      if (!sessionToken) {
        return { 
          ok: false, 
          error: 'AUTH_REQUIRED', 
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
      const amount = Math.max(params.amountUSD || minAmount, minAmount);
      const leverage = Math.max(params.leverage || 1, 1);
      
      // Debug logging for amount adjustments
      if ((params.amountUSD || 0) < minAmount) {
        console.warn(`💰 Amount adjusted to minimum: $${params.amountUSD} → $${amount} (${isScalping ? 'scalp' : 'normal'} mode)`);
      }
      
      // Clean symbol format - remove any slashes or spaces
      const cleanSymbol = params.symbol.replace(/[\/\s]/g, '');
      
      const payload = {
        action: 'place_order',
        symbol: cleanSymbol,
        side: params.side,
        amountUSD: amount,
        leverage: leverage,
        // Forward all order execution parameters with defensive defaults
        orderType: params.orderType ?? 'Market',
        timeInForce: params.timeInForce ?? (params.orderType === 'Limit' ? 'PostOnly' : 'GTC'),
        price: params.price,
        reduceOnly: params.reduceOnly ?? false,
        scalpMode: isScalping,
        entryPrice: params.entryPrice || params.price,
        stopLoss: params.stopLoss,
        takeProfit: params.takeProfit,
        meta: params.meta || {},
        // Add idempotency for reliability
        idempotencyKey: `fe-${cleanSymbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('📤 Request body to edge function:', payload);

      const r = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        const errorText = await r.text();
        console.error('❌ HTTP Error:', r.status, errorText);
        return { 
          ok: false, 
          error: 'HTTP_ERROR', 
          message: `HTTP ${r.status}: ${errorText}`,
          status: r.status
        };
      }

      const data = await r.json();
      
      // Enhanced response logging
      const out: ExecResult = { 
        ok: r.ok && data?.success !== false, 
        status: r.status, 
        data,
        message: data?.message,
        error: data?.error
      };
      console.log('🧭 TradingGateway.execute OUT:', out);
      
      // Enhanced SL/TP confirmation logging
      if (data.success && data.data) {
        const result = data.data;
        console.log('🔍 Order Execution Details:', {
          mainOrder: result.orderId || result.order_id,
          slAttached: !!(result.slOrder || result.stopLossOrder),
          tpAttached: !!(result.tpOrder || result.takeProfitOrder),
          orderType: result.orderType || payload.orderType,
          slPrice: result.slOrder?.triggerPrice || result.stopLossOrder?.price,
          tpPrice: result.tpOrder?.triggerPrice || result.takeProfitOrder?.price
        });
      }
      
      if (!data.success) {
        console.error('❌ Trade execution failed:', data);
        return { 
          ok: false, 
          error: 'TRADE_FAILED', 
          message: data?.error || data?.message || 'Unknown error',
          data: data?.details
        };
      }

      console.log('✅ Live trade executed successfully:', data);
      return out;
      
    } catch (error: any) {
      console.error('❌ Trading gateway error:', error);
      return { ok: false, error: 'NETWORK_ERROR', message: error.message };
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
  }
}