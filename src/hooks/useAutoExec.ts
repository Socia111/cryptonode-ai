import { useEffect, useRef } from 'react';
import { TradingGateway } from '@/lib/tradingGateway';
import { tradingSettings, calcRiskFromEntry } from '@/lib/tradingSettings';

type RankedSignal = {
  id: string;
  token: string;           // e.g. "PEAQ/USDT" or "PEAQUSDT"
  direction: 'BUY'|'SELL'|'Buy'|'Sell';
  grade?: 'A+'|'A'|'B'|'C';
  entry_price?: number;    // from feed, if provided
  take_profit?: number;    // optional from feed
  stop_loss?: number;      // optional from feed
  timeframe?: string;      // "5m","15m","30m","1h"...
  spread_bps?: number;
};

export function useAutoExec(opts: {
  // ranked, best-first
  rankedSignals: RankedSignal[];
  amountUSD: number;
  leverage: number;
  useLimit: boolean;
  scalpMode: boolean;
  enabled: boolean;
  maxSpreadBps?: number;      // default 20
  onSuccess?: (s: RankedSignal, res: any) => void;
  onError?: (s: RankedSignal, e: any) => void;
}) {
  const {
    rankedSignals, amountUSD, leverage, useLimit, scalpMode, enabled,
    maxSpreadBps = 20, onSuccess, onError
  } = opts;

  const seen = useRef<Record<string, number>>({}); // id -> timestamp

  useEffect(() => {
    if (!enabled) return;
    
    (async () => {
      const best = rankedSignals
        .filter(r => (r.grade === 'A+' || r.grade === 'A'))
        .filter(r => r.timeframe !== '1m')
        .filter(r => (r.spread_bps ?? 0) <= maxSpreadBps);

      for (const sig of best.slice(0, 2)) {                 // ultra-conservative: at most 2 per cycle
        const last = seen.current[sig.id] || 0;
        if (Date.now() - last < 2 * 60 * 60 * 1000) continue; // no re-trade within 2h

        try {
          const symbol = sig.token.replace('/', '');
          const side   = /sell/i.test(sig.direction as string) ? 'Sell' : 'Buy';
          const entry  = sig.entry_price; // may be undefined

          // Prefer signal TP/SL; otherwise compute
          const { sl, tp } = calcRiskFromEntry(
            entry ?? 0, side, scalpMode,
            (sig.stop_loss && sig.take_profit) ? { sl: sig.stop_loss, tp: sig.take_profit } : undefined
          );

          const payload = {
            symbol, 
            side: side as 'Buy'|'Sell',
            amountUSD, 
            leverage,
            orderType: (useLimit && entry) ? ('Limit' as const) : ('Market' as const),
            price: entry,
            timeInForce: (useLimit && entry) ? ('PostOnly' as const) : undefined,
            uiEntry: entry,
            uiTP: tp,
            uiSL: sl,
            scalpMode,
            meta: { source: 'auto', signalId: sig.id }
          };

          console.log(`[AutoExec] Placing auto order for ${sig.token} ${sig.direction}`, payload);
          const res = await TradingGateway.execute(payload);
          if (res.ok) {
            seen.current[sig.id] = Date.now();
            console.log(`[AutoExec] Auto order successful: ${sig.token} ${sig.direction}`);
            onSuccess?.(sig, res);
          } else {
            console.error(`[AutoExec] Auto order failed: ${sig.token}`, res.message);
            onError?.(sig, new Error(res.message || 'Failed'));
          }
        } catch (e) {
          console.error(`[AutoExec] Auto order exception: ${sig.token}`, e);
          onError?.(sig, e);
        }
      }
    })();
  }, [rankedSignals, amountUSD, leverage, useLimit, scalpMode, enabled, maxSpreadBps]);
}