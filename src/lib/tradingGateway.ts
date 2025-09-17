import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/featureFlags';
import { tradingSettings } from './tradingSettings';

export type ExecParams = {
  symbol: string
  side: 'BUY'|'SELL'
  notionalUSD?: number  // deprecated, use amountUSD
  amountUSD?: number    // new: USD amount to trade
  leverage?: number     // new: leverage (1-100x)
  scalpMode?: boolean   // new: scalping mode for micro trades
  entryPrice?: number   // signal entry price for limit orders
  stopLoss?: number     // custom stop loss price
  takeProfit?: number   // custom take profit price
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
      
      // Use smaller amounts for testnet testing to avoid balance issues
      const isTestnet = true; // Force testnet for now during development
      const isScalping = params.scalpMode === true;
      const baseAmount = params.amountUSD || params.notionalUSD;
      const minAmount = isTestnet 
        ? (isScalping ? 1 : 5)   // Testnet: $1 scalp, $5 normal  
        : (isScalping ? 10 : 25) // Mainnet: $10 scalp, $25 normal
      const amount = Math.max(baseAmount || minAmount, minAmount);
      const leverage = Math.max(params.leverage || 25, 25); // Force minimum 25x leverage
      
      // Clean symbol format - remove any slashes or spaces
      const cleanSymbol = params.symbol.replace(/[\/\s]/g, '');
      
      console.log('🔧 Trade execution params:', {
        symbol: cleanSymbol,
        side: params.side,
        amountUSD: amount,
        leverage,
        scalpMode: isScalping,
        minAmount,
        functionsBase
      });
      
      // Get global trading settings
      const globalSettings = tradingSettings.getSettings();
      
      // Use provided entry price or signal entry price for limit orders
      const entryPrice = params.entryPrice;
      const orderType = entryPrice ? 'limit' : globalSettings.orderType;
      
      // Calculate SL/TP using global settings if not provided
      let stopLoss = params.stopLoss;
      let takeProfit = params.takeProfit;
      
      if (entryPrice && (!stopLoss || !takeProfit)) {
        const riskPrices = tradingSettings.calculateRiskPrices(
          entryPrice, 
          params.side === 'BUY' ? 'Buy' : 'Sell'
        );
        stopLoss = stopLoss || riskPrices.stopLoss;
        takeProfit = takeProfit || riskPrices.takeProfit;
      }

      const response = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'place_order',
          symbol: cleanSymbol,
          side: params.side === 'BUY' ? 'Buy' : 'Sell',
          amountUSD: amount,
          leverage: leverage,
          scalpMode: isScalping,
          orderType,
          entryPrice,
          stopLoss,
          takeProfit
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
      
      if (!data.success) {
        console.error('❌ Trade execution failed:', data);
        let errorMessage = data?.error || data?.message || 'Unknown error';
        
        // Provide helpful error messages for common issues
        if (errorMessage.includes('ab not enough')) {
          errorMessage = `Insufficient balance. ${errorMessage}. Try reducing the amount to $5 or add more funds to your account.`;
        } else if (errorMessage.includes('reduce-only')) {
          errorMessage = `Position mode error. ${errorMessage}. The system will retry with different position modes.`;
        } else if (errorMessage.includes('position idx')) {
          errorMessage = `Position mode mismatch. ${errorMessage}. The system will attempt to fix this automatically.`;
        }
        
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
      
      if (!sessionToken) {
        console.warn('No session token available for balance check');
        return { 
          ok: false, 
          error: 'Authentication required. Please sign in to check balance.',
          code: 'AUTH_REQUIRED' 
        };
      }
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'authorization': `Bearer ${sessionToken}`,
      };
      
      console.log('🔍 Checking balance via bybit-live-trading function...');
      
      const response = await fetch(`${functionsBase}/bybit-live-trading`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'balance' })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Balance check HTTP error:', response.status, errorText);
        return { 
          ok: false, 
          error: `HTTP ${response.status}: ${errorText}`,
          code: 'HTTP_ERROR'
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        console.error('❌ Balance check failed:', data);
        
        // Provide helpful error messages for common issues
        let errorMessage = data.message || data.error || 'Balance check failed';
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorMessage = 'API authentication failed. Please check your Bybit API credentials in the settings.';
        } else if (errorMessage.includes('MISSING_CREDENTIALS')) {
          errorMessage = 'Bybit API credentials not configured. Please configure your API key and secret in the Edge Function settings.';
        }
        
        return { 
          ok: false, 
          error: errorMessage,
          data: data 
        };
      }
      
      // Handle mock mode responses
      if (data.mockMode) {
        console.log('ℹ️ Using mock balance data - configure API credentials for real data');
      }
      
      console.log('✅ Balance check successful:', data.data);
      return { ok: true, data: data.data };
      
    } catch (error: any) {
      console.error('❌ Error fetching balance:', error);
      return { 
        ok: false, 
        error: error.message || 'Network error during balance check',
        code: 'NETWORK_ERROR'
      };
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