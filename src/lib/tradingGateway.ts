import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/featureFlags'

export type ExecParams = {
  symbol: string
  side: 'BUY'|'SELL'
  notionalUSD: number
}

export const TradingGateway = {
  async execute(params: ExecParams) {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      return { ok: false, code: 'DISABLED', message: 'Auto-trading disabled' }
    }

    try {
      console.log('🚀 Executing trade:', params);
      
      // Use the real Bybit trade executor for live trading
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'signal',
          signal: {
            token: params.symbol,
            direction: params.side === 'BUY' ? 'LONG' : 'SHORT',
            entry_price: 0, // Will be determined by market price
            stop_loss: 0, // Will be calculated based on risk
            exit_target: 0, // Will be calculated based on profit target
            confidence: 85, // Default confidence for manual trades
            leverage: 1
          }
        }
      });

      if (error) {
        console.error('❌ Trade execution failed:', error);
        return { ok: false, code: 'EXECUTION_ERROR', message: error.message };
      }

      if (!data || !data.success) {
        console.error('❌ Trade failed:', data);
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
  }
}