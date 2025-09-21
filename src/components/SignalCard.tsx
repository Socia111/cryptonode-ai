import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AuthGuardedButton } from '@/components/AuthGuardedButton';
import { TradingGateway } from '@/lib/tradingGateway';
import { toast } from '@/hooks/use-toast';

type Props = {
  symbol: string;
  side: 'Buy' | 'Sell';
  entry: number;
  sl: number;
  tp: number;
  confidence: number; // 0..100
  rr?: number | null;
  onExecute?: () => void;
};

export default function SignalCard({
  symbol, side, entry, sl, tp, confidence, rr, onExecute
}: Props) {
  const isLong = side === 'Buy';
  const trendIcon = isLong ? TrendingUp : TrendingDown;

  return (
    <div className={`rounded-xl p-4 space-y-4 border transition-all duration-300 hover:scale-[1.02] ${
      isLong 
        ? 'bg-green-500/20 border-green-500/40 hover:bg-green-500/30' 
        : 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 ${
            isLong 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {React.createElement(trendIcon, { size: 14 })}
            {isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-sm font-medium text-muted-foreground">BYBIT</span>
        </div>
        <div className={`text-lg font-bold ${
          isLong ? 'text-green-400' : 'text-red-400'
        }`}>
          {confidence.toFixed(0)}%
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-foreground font-bold text-xl trading-mono mb-4">
            {symbol}
          </div>
          
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-muted-foreground text-xs font-medium mb-1">ENTRY</div>
              <div className="text-foreground font-bold text-base">
                ${entry.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs font-medium mb-1">STOP LOSS</div>
              <div className="text-red-400 font-bold text-base">
                ${sl.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs font-medium mb-1">TAKE PROFIT</div>
              <div className="text-green-400 font-bold text-base">
                ${tp.toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 ml-6">
          <div className="text-muted-foreground text-sm font-medium">
            R:R {rr ? rr.toFixed(2) : '—'}
          </div>
          <AuthGuardedButton
            onClick={async () => {
              try {
                const res = await TradingGateway.execute({
                  symbol: symbol,
                  side: side === 'Buy' ? 'BUY' : 'SELL',
                  amountUSD: 25
                });
                
                if (res.ok) {
                  toast({
                    title: "✅ Trade Executed",
                    description: `${symbol} ${side} trade placed successfully`,
                    variant: "default",
                  });
                  onExecute?.();
                } else {
                  toast({
                    title: "❌ Trade Failed",
                    description: res.message || 'Failed to execute trade',
                    variant: "destructive",
                  });
                }
              } catch (error: any) {
                toast({
                  title: "❌ Trade Error",
                  description: error.message || 'Failed to execute trade',
                  variant: "destructive",
                });
              }
            }}
            className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 hover:scale-105 ${
              isLong
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
            }`}
            size="sm"
          >
            Execute Trade
          </AuthGuardedButton>
        </div>
      </div>
    </div>
  );
}