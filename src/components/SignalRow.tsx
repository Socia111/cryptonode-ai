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
        <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
          <span>{signal.direction}</span>
          <span>•</span>
          <span className={`${(signal.spread_bps ?? signal.spread ?? 0) > 20 ? 'text-red-600' : 'text-green-600'}`}>
            spread {signal.spread_bps ?? signal.spread ?? 0} bps
          </span>
          <span>•</span>
          <span className={`${(signal.rr ?? signal.risk_reward_ratio ?? 0) >= 2 ? 'text-green-600' : 'text-amber-600'}`}>
            R:R {signal.rr ?? signal.risk_reward_ratio ?? '—'}
          </span>
          {signal.entry_price && (
            <>
              <span>•</span>
              <span className="text-blue-600">@${signal.entry_price}</span>
            </>
          )}
        </div>
      </div>

      <Button size="sm" onClick={() => onTrade(signal)}>
        Trade
      </Button>
    </div>
  );
}