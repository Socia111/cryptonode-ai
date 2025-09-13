import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/featureFlags';
import { ExecuteParams, ExecResult, normalizeSide } from '@/lib/tradingTypes';

const ASSERT = (cond: any, msg: string) => { if (!cond) throw new Error(msg); };

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
        data, 
        message: data?.message, 
        error: data?.error,
        status: r.status
      };
    } catch (error: any) {
      return { 
        ok: false, 
        error: error.message,
        message: 'Connection test failed'
      };
    }
  },

  async execute(p: ExecuteParams): Promise<ExecResult> {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, error: 'DISABLED', message: 'Auto-trading disabled' }
    }

    try {
      // Normalize + assert
      const symbol = (p.symbol || '').replace('/', '').trim().toUpperCase();
      const side   = normalizeSide(p.side as any);
      const amount = Number(p.amountUSD);
      const lev    = Number(p.leverage);

      ASSERT(symbol, 'symbol required');
      ASSERT(side === 'Buy' || side === 'Sell', 'side invalid');
      ASSERT(amount >= 0.10 && amount <= 100, 'amount out of range (0.10–100)');
      ASSERT(lev >= 1 && lev <= 100, 'leverage out of range (1–100)');

      // Order shape
      const orderType   = p.orderType ?? (p.price ? 'Limit' : 'Market');
      const timeInForce = p.timeInForce ?? (orderType === 'Limit' ? 'PostOnly' : 'IOC');

      if (orderType === 'Limit') {
        ASSERT(p.price && p.price > 0, 'price required for Limit');
      }

      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      if (!sessionToken) {
        return { 
          ok: false, 
          error: 'AUTH_REQUIRED', 
          message: 'Please sign in to execute trades' 
        };
      }

      const payload = {
        action: 'place_order',
        symbol,
        side,
        amountUSD: amount,
        leverage: lev,
        orderType,
        timeInForce,
        price: p.price,

        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
        scalpMode: !!p.scalpMode,
        entryPrice: p.entryPrice,

        idempotencyKey: `x1-${symbol}-${side}-${Date.now()}`,
        meta: p.meta || {}
      };

      console.log('🧭 TradingGateway.execute:', payload);

      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'authorization': `Bearer ${sessionToken}`,
      };

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
          message: `HTTP ${r.status}: ${errorText}`,
          error: 'HTTP_ERROR',
          status: r.status
        };
      }

      const data = await r.json();
      
      if (!data.success) {
        console.error('❌ Trade execution failed:', data);
        return { 
          ok: false, 
          message: data?.error || data?.message || 'Unknown error',
          error: 'TRADE_FAILED',
          data: data?.details
        };
      }

      // Expect SL/TP confirmation fields from function if available
      const hasRisk = !!(data?.slOrder || data?.tpOrder || data?.stopLossOrder || data?.takeProfitOrder);
      console.log('✅ Live trade executed successfully:', { ...data, hasRisk });
      return { ok: true, data: { ...data, hasRisk } };
      
    } catch (e: any) {
      console.error('❌ Trading gateway error:', e);
      return { ok: false, message: e?.message ?? 'execute failed', error: 'ASSERT' };
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