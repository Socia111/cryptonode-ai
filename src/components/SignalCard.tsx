import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
  const bg = isLong ? 'status-chip-long' : 'status-chip-short';
  const trendIcon = isLong ? TrendingUp : TrendingDown;
  const trendColor = isLong ? 'trend-up' : 'trend-down';

  return (
    <div className={`surface-elevated p-4 space-y-3 ${bg} border-2 transition-all duration-200 hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${isLong ? 'status-chip-long' : 'status-chip-short'}`}>
            {React.createElement(trendIcon, { size: 12, className: 'inline mr-1' })}
            {isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-xs text-muted-foreground">bybit</span>
        </div>
        <div className={`text-sm font-semibold ${trendColor}`}>
          {confidence.toFixed(0)}%
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-foreground font-bold text-lg trading-mono mb-3">
            {symbol}
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="metric-label">Entry</div>
              <div className="price-display text-sm text-foreground">
                ${entry.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="metric-label">Stop Loss</div>
              <div className="price-display text-sm text-destructive">
                ${sl.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="metric-label">Take Profit</div>
              <div className="price-display text-sm text-success">
                ${tp.toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="text-xs text-muted-foreground">
            R:R {rr ? rr.toFixed(2) : '—'}
          </div>
          <button
            onClick={onExecute}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              isLong
                ? 'bg-success hover:bg-success/80 glow-success text-white'
                : 'bg-destructive hover:bg-destructive/80 glow-danger text-white'
            }`}
          >
            Execute
          </button>
        </div>
      </div>
    </div>
  );
}