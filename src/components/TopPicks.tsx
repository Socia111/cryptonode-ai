import React from 'react';
import { Badge } from '@/components/ui/badge';

type Item = {
  id: string | number;
  token: string;
  direction: 'Buy'|'Sell'|'BUY'|'SELL';
  score?: number;
  grade?: 'A+'|'A'|'B'|'C';
  _score?: number;
  _grade?: 'A+'|'A'|'B'|'C';
};

export function TopPicks({ items, onClick }: { items: Item[]; onClick?: (id: string | number) => void }) {
  if (!items?.length) return null;
  return (
    <div className="mb-3">
      <div className="text-sm font-semibold mb-2">Top Picks</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {items.slice(0,3).map(it => (
          <button
            key={it.id}
            onClick={() => onClick?.(it.id)}
            className="rounded-md border p-3 text-left hover:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{it.token}</div>
              <Badge variant={
                (it.grade || it._grade) === 'A+' ? 'success' :
                (it.grade || it._grade) === 'A'  ? 'default' :
                (it.grade || it._grade) === 'B'  ? 'secondary' : 'outline'
              }>
                {it.grade || it._grade}
              </Badge>
            </div>
            <div className="mt-1 text-xs opacity-70">
              {it.direction} • score {((it.score || it._score || 0)|0)}%
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}