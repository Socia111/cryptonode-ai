import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TradingGateway } from '@/lib/tradingGateway';
import { tradingSettings } from '@/lib/tradingSettings';
import { useToast } from '@/components/ui/use-toast';

interface EnhancedSignalRowProps {
  signal: {
    id: string;
    symbol?: string;
    token?: string;
    direction: string;
    entry_price: number;
    stop_loss?: number;
    take_profit?: number;
    confidence_score: number;
    signal_strength: string;
    risk_level: string;
    created_at: string;
  };
}

export function EnhancedSignalRow({ signal }: EnhancedSignalRowProps) {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = React.useState(false);

  const executeSignalTrade = async () => {
    setIsExecuting(true);
    try {
      // Get global settings for default trade size and leverage
      const settings = tradingSettings.getSettings();
      
      // Calculate risk prices if not provided in signal
      const riskPrices = signal.stop_loss && signal.take_profit ? 
        { stopLoss: signal.stop_loss, takeProfit: signal.take_profit } :
        tradingSettings.calculateRiskPrices(
          signal.entry_price, 
          signal.direction === 'LONG' ? 'Buy' : 'Sell'
        );

      // Ensure we have a proper symbol (map token -> symbol if needed)
      const symbol = signal.symbol || signal.token;
      if (!symbol) {
        throw new Error('No valid symbol found in signal');
      }

      const result = await TradingGateway.execute({
        symbol: symbol.replace('/', ''), // Remove any slashes for Bybit format
        side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
        amountUSD: 25, // Default trade size
        leverage: 10,  // Default leverage
        entryPrice: signal.entry_price,
        stopLoss: riskPrices.stopLoss,
        takeProfit: riskPrices.takeProfit,
        reduceOnly: false // Explicitly set for new positions
      });

      if (result.ok) {
        toast({
          title: "Trade Executed",
          description: `${signal.direction} ${signal.symbol} order placed successfully`,
        });
      } else {
        toast({
          title: "Trade Failed",
          description: result.message || "Failed to execute trade",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute trade",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const riskReward = signal.take_profit && signal.stop_loss ? 
    Math.abs((signal.take_profit - signal.entry_price) / (signal.stop_loss - signal.entry_price)).toFixed(1) : 
    'N/A';

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="font-medium">{signal.symbol}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(signal.created_at).toLocaleTimeString()}
          </span>
        </div>
        
        <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
          {signal.direction}
        </Badge>
        
        <div className="text-sm">
          <div>Entry: <span className="font-mono">${signal.entry_price.toFixed(4)}</span></div>
          {signal.stop_loss && (
            <div className="text-red-600">SL: <span className="font-mono">${signal.stop_loss.toFixed(4)}</span></div>
          )}
          {signal.take_profit && (
            <div className="text-green-600">TP: <span className="font-mono">${signal.take_profit.toFixed(4)}</span></div>
          )}
        </div>
        
        <div className="text-sm">
          <div>Score: <span className="font-medium">{signal.confidence_score}%</span></div>
          <div>R:R: <span className="font-medium">{riskReward}:1</span></div>
        </div>
        
        <Badge variant="outline">
          {signal.signal_strength}
        </Badge>
      </div>
      
      <Button 
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          executeSignalTrade();
        }}
        disabled={isExecuting}
        size="sm"
        className={signal.direction === 'LONG' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
      >
        {isExecuting ? 'Executing...' : `Trade ${signal.direction}`}
      </Button>
    </div>
  );
}