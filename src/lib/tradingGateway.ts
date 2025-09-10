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
      console.log('🚀 Executing real trade:', params);
      
      // Call the Bybit broker edge function for real trading
      const { data, error } = await supabase.functions.invoke('bybit-broker', {
        body: {
          action: 'place_order',
          symbol: params.symbol.replace('/', ''),  // Convert BTC/USDT to BTCUSDT
          side: params.side,
          orderType: 'Market',
          qty: (params.notionalUSD / 1).toString(), // Convert USD to base amount (simplified)
          timeInForce: 'IOC'
        }
      });

      if (error) {
        console.error('❌ Trade execution failed:', error);
        return { ok: false, code: 'EXECUTION_ERROR', message: error.message };
      }

      console.log('✅ Trade executed successfully:', data);
      return { ok: true, data };
      
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
      console.log('🚀 Executing bulk trades:', list.length, 'orders');
      
      const results = await Promise.allSettled(
        list.map(params => this.execute(params))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
      const failed = results.length - successful;

      return { 
        ok: true, 
        data: { successful, failed, total: results.length },
        results 
      };
      
    } catch (error: any) {
      console.error('❌ Bulk trading error:', error);
      return { ok: false, code: 'BULK_ERROR', message: error.message };
    }
  }
}