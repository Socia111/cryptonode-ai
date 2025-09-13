import * as React from 'react';
import { TradingGateway } from '@/lib/tradingGateway';
import { useGlobalTrade } from '@/store/useGlobalTrade';

type Ranked = { id: string; token: string; direction: string; _grade: 'A+'|'A'|'B'|'C'; timeframe?: string };

export function useAutoExec(opts: {
  rankedSignals: Ranked[];
  skip?: (s: Ranked) => boolean;
  onSuccess?: (s: Ranked) => void;
  onError?: (s: Ranked, e: any) => void;
}) {
  const { rankedSignals, skip, onSuccess, onError } = opts;
  const { auto, amountUSD, leverage } = useGlobalTrade();
  const [busy, setBusy] = React.useState(false);
  const lastIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!auto || busy || !rankedSignals?.length) return;
    const candidate = rankedSignals.find(s =>
      (s._grade === 'A+' || s._grade === 'A') &&
      (!skip || !skip(s)) &&
      s.id !== lastIdRef.current
    );
    if (!candidate) return;

    (async () => {
      try {
        setBusy(true);
        console.log('🤖 Auto-executing signal:', candidate);
        
        const res = await TradingGateway.execute({
          symbol: candidate.token,
          side: (candidate.direction as any), // normalized inside gateway
          amountUSD,
          leverage,
          orderType: 'Market',
          timeInForce: 'IOC',
          reduceOnly: false // Explicitly ensure we're opening new positions
        });
        
        lastIdRef.current = candidate.id;
        console.log('🤖 Auto-execution result:', res);
        
        if (res.ok) {
          onSuccess?.(candidate);
        } else {
          console.error('🤖 Auto-execution failed:', res.message);
          onError?.(candidate, res);
        }
      } catch (e) {
        console.error('🤖 Auto-execution error:', e);
        onError?.(candidate, e);
      } finally {
        setBusy(false);
      }
    })();
  // watch only rank list + settings + auto
  }, [rankedSignals, auto, amountUSD, leverage, skip]);
}