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
  orderType?: 'Market' | 'Limit'  // order type
  price?: number        // limit price (required for limit orders)
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PostOnly' | 'ImmediateOrCancel'
  meta?: Record<string, any>  // optional metadata
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
      console.log('🧭 TradingGateway.execute IN:', params);
      
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
      const baseAmount = params.amountUSD || params.notionalUSD;
      const minAmount = isScalping ? 1 : 5; // $1 for scalping, $5 for normal
      const amount = Math.max(baseAmount || minAmount, minAmount);
      const leverage = Math.max(params.leverage || 1, 1);
      
      // Debug logging for amount adjustments
      if ((baseAmount || 0) < minAmount) {
        console.warn(`💰 Amount adjusted to minimum: $${baseAmount} → $${amount} (${isScalping ? 'scalp' : 'normal'} mode)`);
      }
      
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
      const orderType = params.orderType || (entryPrice ? 'Limit' : globalSettings.orderType);
      const limitPrice = params.price || (orderType === 'Limit' ? entryPrice : undefined);
      const timeInForce = params.timeInForce || (orderType === 'Limit' ? 'PostOnly' : 'ImmediateOrCancel');
      
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
        
        // Debug logging for SL/TP calculation
        const settings = tradingSettings.getSettings();
        console.log(`🎯 Risk Management Debug:`, {
          entryPrice,
          side: params.side,
          slPercent: settings.defaultSLPercent,
          tpPercent: settings.defaultTPPercent,
          calculatedSL: riskPrices.stopLoss,
          calculatedTP: riskPrices.takeProfit,
          finalSL: stopLoss,
          finalTP: takeProfit,
          scalpMode: settings.useScalpingMode
        });
      } else {
        console.log(`⚠️ SL/TP Calculation Skipped:`, {
          hasEntryPrice: !!entryPrice,
          hasCustomSL: !!stopLoss,
          hasCustomTP: !!takeProfit,
          entryPrice,
          stopLoss,
          takeProfit
        });
      }

      const body = {
        action: 'place_order',
        symbol: cleanSymbol,
        side: params.side === 'BUY' ? 'Buy' : 'Sell',
        amountUSD: amount,
        leverage: leverage,
        scalpMode: isScalping,
        // 👇 Forward all order execution parameters
        orderType,
        price: limitPrice,
        timeInForce,
        entryPrice,
        stopLoss,
        takeProfit,
        meta: params.meta || {}
      };
      
      console.log('📤 Request body to edge function:', body);

      const response = await fetch(`${functionsBase}/aitradex1-trade-executor`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
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
      
      // Enhanced response logging
      const out = { 
        ok: response.ok && data?.success !== false, 
        status: response.status, 
        ...data 
      };
      console.log('🧭 TradingGateway.execute OUT:', out);
      
      // Enhanced SL/TP confirmation logging
      if (data.success && data.data) {
        const result = data.data;
        console.log('🔍 Order Execution Details:', {
          mainOrder: result.orderId || result.order_id,
          slAttached: !!(result.slOrder || result.stopLossOrder),
          tpAttached: !!(result.tpOrder || result.takeProfitOrder),
          orderType: result.orderType || 'market',
          slPrice: result.slOrder?.triggerPrice || result.stopLossOrder?.price,
          tpPrice: result.tpOrder?.triggerPrice || result.takeProfitOrder?.price
        });
      }
      
      if (!data.success) {
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