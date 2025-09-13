import * as React from 'react';
import { useAutoTradeStore } from '@/store/autoTradeStore';
import type { UISignal } from '@/lib/signalScoring';
import { TradingGateway } from '@/lib/tradingGateway';

type Args = {
  rankedSignals: (UISignal & { _score: number; _grade: 'A+'|'A'|'B'|'C' })[];
  // optional filter (e.g., skip 1m)
  skip?: (s: UISignal & { _grade: string }) => boolean;
  onSuccess?: (s: UISignal, res: any) => void;
  onError?: (s: UISignal, err: any) => void;
};

export function useAutoExec({ rankedSignals, skip, onSuccess, onError }: Args) {
  const { enabled, amountUSD, leverage } = useAutoTradeStore();
  const [executingId, setExecutingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled || !rankedSignals.length || executingId) return;

    const pick = rankedSignals.find(s => (s._grade === 'A+' || s._grade === 'A') && !(skip?.(s)));
    if (!pick) return;

    let cancelled = false;
    (async () => {
      try {
        setExecutingId(pick.id);
        const res = await TradingGateway.execute({
          symbol: pick.token,
          side: pick.direction === 'BUY' ? 'Buy' : 'Sell',
          amountUSD,
          leverage,
        });
        if (!cancelled) {
          if (res?.ok) onSuccess?.(pick, res);
          else onError?.(pick, res);
        }
      } catch (err) {
        if (!cancelled) onError?.(pick, err);
      } finally {
        if (!cancelled) setExecutingId(null);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, rankedSignals, amountUSD, leverage, executingId]);

  return { executingId };
}