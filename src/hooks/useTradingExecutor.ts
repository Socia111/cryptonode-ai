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
  paperMode?: boolean;
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

      // For demo purposes, we'll use paper trading by default
      const tradeParams = {
        ...params,
        paperMode: params.paperMode ?? true
      };

      // Get current user for authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('paper-trading-executor', {
        body: {
          ...tradeParams,
          userId: user?.id
        }
      });

      if (error) throw error;

      const result: TradeResult = {
        success: true,
        orderId: data.order_id,
        message: `${params.side.toUpperCase()} order for ${params.amount} USDT of ${params.symbol} executed successfully`,
        executedPrice: data.executed_price,
        fees: data.fees
      };

      setLastTrade(result);

      toast({
        title: tradeParams.paperMode ? "📝 Paper Trade Executed" : "✅ Trade Executed",
        description: result.message
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

  const executeSignalTrade = async (signal: any, amount: number, paperMode: boolean = true): Promise<TradeResult> => {
    const tradeParams: TradeParams = {
      symbol: signal.symbol,
      side: signal.direction === 'LONG' ? 'buy' : 'sell',
      amount,
      leverage: signal.leverage || 1,
      orderType: 'market',
      stopLoss: signal.stop_loss,
      takeProfit: signal.take_profit,
      paperMode
    };

    return executeTrade(tradeParams);
  };

  const closePosition = async (symbol: string, paperMode: boolean = true): Promise<TradeResult> => {
    try {
      setExecuting(true);

      const { data, error } = await supabase.functions.invoke('bybit-order-execution', {
        body: {
          symbol,
          action: 'close_position',
          paperMode
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
        title: paperMode ? "📝 Paper Position Closed" : "✅ Position Closed",
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