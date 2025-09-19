import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TradeParams {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  leverage?: number;
  orderType?: 'market' | 'limit';
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  
}

interface TradeResult {
  success: boolean;
  orderId?: string;
  message: string;
  executedPrice?: number;
  fees?: number;
}

export function useTradingExecutor() {
  const [executing, setExecuting] = useState(false);
  const [lastTrade, setLastTrade] = useState<TradeResult | null>(null);
  const { toast } = useToast();

  const executeTrade = async (params: TradeParams): Promise<TradeResult> => {
    try {
      setExecuting(true);

      // Validate parameters
      if (!params.symbol || !params.side || !params.amount) {
        throw new Error('Missing required trade parameters');
      }

      // Execute live trade using real Bybit API
      console.log('📡 Executing REAL Bybit trade with:', params);
      
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'execute_trade',
          symbol: params.symbol,
          side: params.side.toUpperCase(),
          amount_usd: params.amount,
          leverage: params.leverage || 1,
          order_type: 'Market',
          paper_mode: false, // REAL TRADING
          user_id: null // Will use system credentials
        }
      });

      if (error) throw error;

      // Handle Bybit API response format
      if (!data.success) {
        throw new Error(data.error || 'Trade execution failed');
      }

      const result: TradeResult = {
        success: true,
        orderId: data.trade_id,
        message: `${params.side.toUpperCase()} order for ${params.amount} USDT of ${params.symbol} executed on Bybit`,
        executedPrice: data.avg_price ? parseFloat(data.avg_price) : undefined,
        fees: data.result?.cumExecFee ? parseFloat(data.result.cumExecFee) : undefined
      };

      setLastTrade(result);

      toast({
        title: "✅ Real Trade Executed",
        description: result.message,
        variant: "default"
      });

      return result;

    } catch (err: any) {
      console.error('Trade execution failed:', err);
      
      const result: TradeResult = {
        success: false,
        message: err.message || 'Trade execution failed'
      };

      setLastTrade(result);

      toast({
        title: "❌ Trade Failed",
        description: result.message,
        variant: "destructive"
      });

      return result;

    } finally {
      setExecuting(false);
    }
  };

  const executeSignalTrade = async (signal: any, amount: number): Promise<TradeResult> => {
    console.log('🔥 ExecuteSignalTrade called with:', { signal, amount });
    
    // Handle both 'side' and 'direction' fields for signal direction
    const direction = signal.side || signal.direction;
    const side = direction === 'LONG' ? 'buy' : direction === 'SHORT' ? 'sell' : direction?.toLowerCase();
    
    if (!side || !['buy', 'sell'].includes(side)) {
      throw new Error(`Invalid signal direction: ${direction}. Expected LONG/SHORT or buy/sell`);
    }
    
    const tradeParams: TradeParams = {
      symbol: signal.symbol,
      side: side as 'buy' | 'sell',
      amount,
      leverage: signal.leverage || 1,
      orderType: 'market',
      stopLoss: signal.stop_loss,
      takeProfit: signal.take_profit_1 || signal.take_profit
    };

    console.log('📊 Converted trade params:', tradeParams);
    return executeTrade(tradeParams);
  };

  const closePosition = async (symbol: string): Promise<TradeResult> => {
    try {
      setExecuting(true);

      const { data, error } = await supabase.functions.invoke('bybit-order-execution', {
        body: {
          symbol,
          action: 'close_position'
        }
      });

      if (error) throw error;

      const result: TradeResult = {
        success: true,
        message: `Position for ${symbol} closed successfully`,
        executedPrice: data.executed_price
      };

      setLastTrade(result);

      toast({
        title: "✅ Position Closed",
        description: result.message
      });

      return result;

    } catch (err: any) {
      console.error('Position close failed:', err);
      
      const result: TradeResult = {
        success: false,
        message: err.message || 'Failed to close position'
      };

      setLastTrade(result);

      toast({
        title: "❌ Close Failed",
        description: result.message,
        variant: "destructive"
      });

      return result;

    } finally {
      setExecuting(false);
    }
  };

  return {
    executing,
    lastTrade,
    executeTrade,
    executeSignalTrade,
    closePosition
  };
}