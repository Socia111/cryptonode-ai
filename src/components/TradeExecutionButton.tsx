import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap } from 'lucide-react';

interface TradeExecutionButtonProps {
  signal: {
    id: string;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    entry_price: number;
    stop_loss?: number;
    take_profit?: number;
    score: number;
    timeframe: string;
  };
  amountUSD?: number;
  leverage?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const TradeExecutionButton: React.FC<TradeExecutionButtonProps> = ({
  signal,
  amountUSD = 25,
  leverage = 3,
  onSuccess,
  onError
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const executeTradeOrder = async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    
    try {
      console.log('🚀 Executing trade for signal:', signal);
      
      const result = await TradingGateway.execute({
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'BUY' : 'SELL',
        amountUSD,
        leverage
      });

      if (result.ok) {
        toast({
          title: "✅ Trade Executed Successfully",
          description: `${signal.symbol} ${signal.direction} - $${amountUSD} @ ${leverage}x`,
          variant: "default",
        });
        onSuccess?.();
      } else {
        const errorMsg = result.message || 'Trade execution failed';
        toast({
          title: "❌ Trade Failed",
          description: errorMsg,
          variant: "destructive",
        });
        onError?.(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unexpected error occurred';
      console.error('Trade execution error:', error);
      
      toast({
        title: "❌ Trade Error",
        description: errorMsg,
        variant: "destructive",
      });
      onError?.(errorMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const formatDirection = (direction: string) => {
    return direction === 'LONG' ? 'Buy' : 'Sell';
  };

  const getButtonColor = (direction: string) => {
    return direction === 'LONG' 
      ? 'bg-green-600 hover:bg-green-700 text-white' 
      : 'bg-red-600 hover:bg-red-700 text-white';
  };

  return (
    <Button
      onClick={executeTradeOrder}
      disabled={isExecuting}
      className={`${getButtonColor(signal.direction)} transition-all duration-200 hover:scale-105`}
      size="sm"
    >
      {isExecuting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Executing...
        </>
      ) : (
        <>
          <Zap className="w-4 h-4 mr-2" />
          {formatDirection(signal.direction)} ${amountUSD}
        </>
      )}
    </Button>
  );
};

export default TradeExecutionButton;