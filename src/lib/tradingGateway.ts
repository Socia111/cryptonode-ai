import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/featureFlags'

export type ExecParams = {
  symbol: string
  side: 'BUY'|'SELL'
  notionalUSD: number
}

// Get the functions base URL dynamically from supabase client
function getFunctionsBaseUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL environment variable is not set');
  }
  return supabaseUrl.replace('.supabase.co', '.functions.supabase.co');
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
  async execute(params: ExecParams) {
    const autoTradingEnabled = FEATURES.AUTOTRADE_ENABLED
    if (!autoTradingEnabled) {
      console.warn('[TradingGateway] Auto-trading disabled in feature flags')
      return { ok: false, message: 'Auto-trading disabled in config' }
    }

    console.log('[TradingGateway] 🚀 Executing trade:', params)

    try {
      // Call the restored edge function
      const functionsBase = getFunctionsBaseUrl()
      const response = await fetch(
        `${functionsBase}/aitradex1-trade-executor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            symbol: params.symbol,
            side: params.side,
            amount_usd: params.notionalUSD || 100,
            leverage: 1,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[TradingGateway] HTTP Error:', response.status, errorText)
        return { 
          ok: false, 
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${errorText}` 
        }
      }

      const data = await response.json()

      if (data.success) {
        console.log('[TradingGateway] ✅ Trade executed:', data.orderId)
        return { 
          ok: true, 
          orderId: data.orderId, 
          data,
          message: `Order ${data.orderId} executed successfully`
        }
      } else {
        console.error('[TradingGateway] ❌ Trade failed:', data.error)
        return { 
          ok: false, 
          code: 'TRADE_FAILED',
          message: data.error || 'Failed to execute trade' 
        }
      }
    } catch (error: any) {
      console.error('[TradingGateway] Exception:', error)
      return { 
        ok: false, 
        code: 'NETWORK_ERROR',
        message: `Trade execution error: ${error.message}` 
      }
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

  async bulkExecute(list: ExecParams[]) {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, code: 'DISABLED', message: 'Auto-trading disabled' }
    }

    try {
      console.log('🚀 Queuing bulk trades:', list.length, 'orders');
      
      // Import trade queue here to avoid circular dependencies
      const { tradeQueue } = await import('./tradeQueue');
      
      const tradeIds = list.map(params => tradeQueue.addTrade(params));
      
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