import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/featureFlags'

export type ExecParams = {
  symbol: string
  side: 'BUY'|'SELL'
  notionalUSD?: number  // deprecated, use amountUSD
  amountUSD?: number    // new: USD amount to trade
  leverage?: number     // new: leverage (1-100x)
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
  async execute(params: ExecParams) {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, code: 'DISABLED', message: 'Auto-trading disabled' }
    }

    try {
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
      
      // Convert to Bybit signal format
      const amount = params.amountUSD || params.notionalUSD || 25; // fallback to old param or default
      const leverage = params.leverage || 1;
      
      // Ensure minimum order size to avoid "not enough for new order" error
      const minAmount = 5; // Minimum $5 order
      const finalAmount = Math.max(amount, minAmount);
      
      console.log(`Order details: ${params.symbol} ${params.side} $${finalAmount} (${leverage}x leverage)`);
      
      const response = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'place_order',
          symbol: params.symbol.replace('/', ''),
          side: params.side === 'BUY' ? 'Buy' : 'Sell',
          amountUSD: finalAmount,
          leverage: leverage
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
      
      if (!data.success) {
        console.error('❌ Trade execution failed:', data);
        const errorMessage = data?.error || data?.message || 'Unknown error';
        return { ok: false, code: 'TRADE_FAILED', message: errorMessage };
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