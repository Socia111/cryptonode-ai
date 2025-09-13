import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TradeControls } from './TradeControls';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from '@/hooks/use-toast';

interface Signal {
  id: number;
  token: string;
  direction: 'BUY' | 'SELL';
  entry_price?: number;
  take_profit?: number;
  stop_loss?: number;
  score: number;
}

interface TradingModalProps {
  signal: Signal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TradingModal: React.FC<TradingModalProps> = ({ 
  signal, 
  isOpen, 
  onClose 
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  if (!signal) return null;

  const handleExecute = async ({ amountUSD, leverage }: { amountUSD: number; leverage: number }) => {
    setIsExecuting(true);
    
    try {
      const res = await TradingGateway.execute({
        symbol: signal.token,
        side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
        amountUSD,
        leverage,
        uiEntry: signal.entry_price,
        uiTP: signal.take_profit,
        uiSL: signal.stop_loss
      });
      
      if (res.ok) {
        toast({
          title: "✅ Trade Executed",
          description: `${signal.token} ${signal.direction} order placed with ${leverage}x leverage`,
          variant: "default",
        });
        onClose();
      } else {
        toast({
          title: "❌ Trade Failed",
          description: res.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Trade Error",
        description: error.message || "Failed to execute trade",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Execute Trade: {signal.token}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Direction:</span>
            <span className={signal.direction === 'BUY' ? 'text-green-500' : 'text-red-500'}>
              {signal.direction}
            </span>
          </div>
          
          {signal.entry_price && (
            <div className="flex justify-between text-sm">
              <span>Entry Price:</span>
              <span>${signal.entry_price.toFixed(4)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Confidence:</span>
            <span>{signal.score}%</span>
          </div>
          
          <TradeControls
            symbol={signal.token}
            side={signal.direction === 'BUY' ? 'Buy' : 'Sell'}
            markPrice={signal.entry_price}
            onExecute={handleExecute}
            isExecuting={isExecuting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};