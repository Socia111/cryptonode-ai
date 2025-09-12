import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function SignalRow({
  signal,
  onTrade,
}: {
  signal: any & { _score: number; _grade: 'A+'|'A'|'B'|'C' };
  onTrade: (s: any) => void;
}) {
  return (
    <div className="flex items-center justify-between border rounded-md p-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="font-medium">{signal.token}</div>
          <Badge variant={
            signal._grade === 'A+' ? 'success' :
            signal._grade === 'A'  ? 'default' :
            signal._grade === 'B'  ? 'secondary' : 'outline'
          }>
            {signal._grade}
          </Badge>
          <span className="text-xs opacity-60">score {(signal._score*100|0)}%</span>
        </div>
        <div className="text-xs opacity-70 mt-1">
          {signal.direction} • spread {signal.spread_bps ?? signal.spread ?? 0} bps • R:R {signal.rr ?? signal.risk_reward_ratio ?? '—'}
        </div>
      </div>

      <Button size="sm" onClick={() => onTrade(signal)}>
        Trade
      </Button>
    </div>
  );
}