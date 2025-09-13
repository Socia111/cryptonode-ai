import * as React from 'react';
import { TradingGateway } from '@/lib/tradingGateway';
import { useGlobalTrade } from '@/store/useGlobalTrade';

type Ranked = { id: string | number; token?: string; symbol?: string; direction: string; grade: 'A+'|'A'|'B'|'C'; timeframe?: string };

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
      (s.grade === 'A+' || s.grade === 'A') &&
      (!skip || !skip(s)) &&
      String(s.id) !== lastIdRef.current
    );
    if (!candidate) return;

    (async () => {
      try {
        setBusy(true);
        console.log('🤖 Auto-executing signal:', candidate);
        
        // Ensure we have a proper symbol (map token -> symbol if needed)
        const symbol = candidate.token || (candidate as any).symbol;
        if (!symbol) {
          throw new Error('No valid symbol found in signal');
        }

        // Ensure leverage is valid
        const finalLeverage = leverage && leverage >= 1 && leverage <= 100 ? leverage : 10;

        const res = await TradingGateway.execute({
          symbol: symbol.replace('/', ''), // Remove any slashes for Bybit format
          side: (candidate.direction as any), // normalized inside gateway
          amountUSD: amountUSD || 25, // Ensure we have a valid amount
          leverage: finalLeverage,
          orderType: 'Market',
          timeInForce: 'IOC',
          reduceOnly: false // Explicitly ensure we're opening new positions
        });
        
        lastIdRef.current = String(candidate.id);
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