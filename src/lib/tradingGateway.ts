import { supabase } from '@/lib/supabaseClient';
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
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, code: 'DISABLED', message: 'Auto-trading disabled' }
    }

    try {
      console.log('🚀 Executing trade:', params);
      
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      
      // Add authorization header if we have a session token
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
      
      const idempotencyKey = `web-${params.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'signal',
          idempotencyKey,
          signal: {
            symbol: params.symbol.replace('/', ''), // Convert PERP/USDT to PERPUSDT for Bybit
            direction: params.side === 'BUY' ? 'LONG' : 'SHORT',
            entry_price: 50000, // Default market price placeholder (will be updated by executor)
            stop_loss: 45000, // Default SL placeholder (will be calculated by executor)
            take_profit: 60000, // Default TP placeholder (will be calculated by executor)
            confidence_score: 0.85, // Confidence as decimal (0-1)
            pms_score: 0.8, // Default PMS score for manual trades
            risk_reward_ratio: 2.0, // Default RR ratio
            regime: 'trending', // Default regime
            atr: 0.01, // Default ATR
            indicators: {
              notionalUSD: params.notionalUSD,
              leverage: 3
            }
          }
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
        const errorMessage = data?.reason || data?.message || 'Unknown error';
        return { ok: false, code: 'TRADE_FAILED', message: errorMessage };
      }

      console.log('✅ Live trade executed successfully:', data);
      return { ok: true, data: data.result || data };
      
    } catch (error: any) {
      console.error('❌ Trading gateway error:', error);
      return { ok: false, code: 'NETWORK_ERROR', message: error.message };
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