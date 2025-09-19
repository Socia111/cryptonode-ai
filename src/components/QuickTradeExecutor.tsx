import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';
import { TrendingUp, TrendingDown, DollarSign, Target, Shield } from 'lucide-react';

interface QuickTradeExecutorProps {
  signal: any;
  onClose?: () => void;
}

export function QuickTradeExecutor({ signal, onClose }: QuickTradeExecutorProps) {
  const { executing, executeSignalTrade } = useTradingExecutor();
  const [tradeAmount, setTradeAmount] = useState(50);

  const handleQuickTrade = async (amount: number) => {
    try {
      console.log('🚀 Quick trade execution:', { signal, amount });
      await executeSignalTrade(signal, amount);
      onClose?.();
    } catch (error) {
      console.error('Quick trade failed:', error);
    }
  };

  const formatPrice = (price: number) => price?.toFixed(4) || '0.0000';
  const calculateRR = () => {
    const risk = Math.abs(signal.entry_price - signal.stop_loss);
    const reward = Math.abs(signal.take_profit_1 || signal.take_profit - signal.entry_price);
    return reward / risk;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{signal.symbol}</span>
            <Badge variant={signal.side === 'LONG' ? 'default' : 'destructive'}>
              {signal.side === 'LONG' ? (
                <><TrendingUp className="h-3 w-3 mr-1" /> LONG</>
              ) : (
                <><TrendingDown className="h-3 w-3 mr-1" /> SHORT</>
              )}
            </Badge>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Signal Details */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="text-muted-foreground">Entry</div>
            <div className="font-medium">${formatPrice(signal.entry_price)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" /> SL
            </div>
            <div className="font-medium text-red-600">${formatPrice(signal.stop_loss)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground flex items-center justify-center gap-1">
              <Target className="h-3 w-3" /> TP
            </div>
            <div className="font-medium text-green-600">
              ${formatPrice(signal.take_profit_1 || signal.take_profit)}
            </div>
          </div>
        </div>

        {/* Risk/Reward */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Risk:Reward </span>
          <span className="font-medium">{calculateRR().toFixed(2)}:1</span>
        </div>

        {/* Quick Trade Buttons */}
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Quick Trade Amounts (USDT)
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[25, 50, 100].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                disabled={executing}
                onClick={() => handleQuickTrade(amount)}
                className="w-full"
              >
                ${amount}
              </Button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {[200, 500].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                disabled={executing}
                onClick={() => handleQuickTrade(amount)}
                className="w-full"
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Execute Button */}
        <Button
          onClick={() => handleQuickTrade(tradeAmount)}
          disabled={executing}
          className="w-full bg-primary hover:bg-primary/90"
          size="lg"
        >
          {executing ? 'Executing...' : `Execute Trade - $${tradeAmount}`}
        </Button>

        {/* Risk Warning */}
        <div className="text-xs text-muted-foreground text-center">
          ⚠️ Trading involves risk. Only trade with money you can afford to lose.
        </div>
      </CardContent>
    </Card>
  );
}