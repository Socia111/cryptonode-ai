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
      
      // Use the new reliable trade executor
      const { data, error } = await supabase.functions.invoke('trade-executor', {
        body: {
          symbol: params.symbol,
          side: params.side,
          notionalUSD: params.notionalUSD,
          testMode: true // Enable test mode for now
        }
      });

      if (error) {
        console.error('❌ Trade execution failed:', error);
        return { ok: false, code: 'EXECUTION_ERROR', message: error.message };
      }

      if (!data.ok) {
        console.error('❌ Trade failed:', data.error);
        return { ok: false, code: 'TRADE_FAILED', message: data.error };
      }

      console.log('✅ Trade executed successfully:', data.data);
      return { ok: true, data: data.data };
      
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