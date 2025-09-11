import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Target, Shield, DollarSign } from 'lucide-react';
import { TradingGateway } from '@/lib/tradingGateway';
import { toast } from 'sonner';

interface Signal {
  id: string | number;
  token: string;
  direction: 'BUY' | 'SELL';
  entry_price?: number;
  tp?: number;
  sl?: number;
  score?: number;
}

interface TradingModalProps {
  signal: Signal | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TradingModal({ signal, isOpen, onClose }: TradingModalProps) {
  const [amountUSD, setAmountUSD] = useState(10);
  const [leverage, setLeverage] = useState(2);
  const [isExecuting, setIsExecuting] = useState(false);

  if (!signal) return null;

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      
      const result = await TradingGateway.execute({
        symbol: signal.token,
        side: signal.direction,
        amountUSD: amountUSD,
        leverage,
        prices: {
          entry: signal.entry_price,
          takeProfit: signal.tp,
          stopLoss: signal.sl
        }
      });

      if (result.ok) {
        toast.success(`Trade executed successfully for ${signal.token}`);
        onClose();
      } else {
        toast.error(result.message || 'Trade execution failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Trade execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const calculateNotional = () => amountUSD * leverage;
  const calculateRiskReward = () => {
    if (!signal.entry_price || !signal.tp || !signal.sl) return null;
    
    const entry = signal.entry_price;
    const tp = signal.tp;
    const sl = signal.sl;
    
    if (signal.direction === 'BUY') {
      const risk = entry - sl;
      const reward = tp - entry;
      return reward / risk;
    } else {
      const risk = sl - entry;
      const reward = entry - tp;
      return reward / risk;
    }
  };

  const riskReward = calculateRiskReward();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {signal.direction === 'BUY' ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            Execute Trade: {signal.token}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signal Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Direction</Label>
              <Badge variant={signal.direction === 'BUY' ? 'success' : 'destructive'}>
                {signal.direction}
              </Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Score</Label>
              <div className="text-sm font-medium">{signal.score?.toFixed(0)}%</div>
            </div>
          </div>

          {/* Price Levels */}
          {(signal.entry_price || signal.tp || signal.sl) && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Price Levels</Label>
              <div className="grid gap-2">
                {signal.entry_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      Entry
                    </span>
                    <span className="text-sm font-mono">${signal.entry_price.toFixed(6)}</span>
                  </div>
                )}
                {signal.tp && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600 flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      Take Profit
                    </span>
                    <span className="text-sm font-mono">${signal.tp.toFixed(6)}</span>
                  </div>
                )}
                {signal.sl && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-600 flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      Stop Loss
                    </span>
                    <span className="text-sm font-mono">${signal.sl.toFixed(6)}</span>
                  </div>
                )}
                {riskReward && (
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="text-sm text-muted-foreground">Risk/Reward</span>
                    <span className="text-sm font-medium">1:{riskReward.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Trade Settings */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Amount ($)</Label>
                <Input
                  type="number"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(Number(e.target.value))}
                  min={1}
                  max={1000}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Leverage</Label>
                <Input
                  type="number"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  min={1}
                  max={10}
                />
              </div>
            </div>

            {/* Position Size */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  Position Size
                </span>
                <span className="text-sm font-medium">${calculateNotional().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleExecute} 
              disabled={isExecuting}
              className="flex-1"
            >
              {isExecuting ? 'Executing...' : 'Execute Trade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}