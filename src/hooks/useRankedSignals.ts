import { useMemo } from 'react';
import { UISignal, compositeScore, gradeFromComposite } from '@/lib/signalScoring';
import { isInnovationZonePair } from '@/lib/innovationZone';

type Options = {
  hideWideSpreads?: boolean;  // if true, hide spread > 20 bps
  maxSpreadBps?: number;      // default 20
  hide1MinSignals?: boolean;  // if true, hide 1-minute timeframe signals
  excludeInnovationZone?: boolean; // if true, hide Innovation Zone pairs
};

export function useRankedSignals(signals: UISignal[], opts?: Options) {
  const { hideWideSpreads = true, maxSpreadBps = 20, hide1MinSignals = false, excludeInnovationZone = true } = opts ?? {};

  return useMemo(() => {
    const mapped = (signals || []).map((s) => {
      const score = compositeScore(s);
      const grade = gradeFromComposite(score);
      return { ...s, _score: score, _grade: grade } as UISignal & { _score: number; _grade: ReturnType<typeof gradeFromComposite> };
    });

    let filtered = hideWideSpreads
      ? mapped.filter(s => (s.spread_bps ?? 0) <= maxSpreadBps)
      : mapped;

    // Filter out 1-minute signals if requested
    if (hide1MinSignals) {
      filtered = filtered.filter(s => {
        const timeframe = s.timeframe?.toLowerCase() || '';
        return !timeframe.includes('1m') && !timeframe.includes('1min');
      });
    }

    // Filter out Innovation Zone pairs if requested
    if (excludeInnovationZone) {
      filtered = filtered.filter(s => !isInnovationZonePair(s.token));
    }

    // ⭐ Priority (score) sort by default; most recent tie-breaker if timestamps exist
    filtered.sort((a, b) => {
      const diff = (b as any)._score - (a as any)._score;
      if (Math.abs(diff) > 1e-6) return diff;
      const ta = typeof a.ts === 'string' ? Date.parse(a.ts) : (a.ts ?? 0);
      const tb = typeof b.ts === 'string' ? Date.parse(b.ts) : (b.ts ?? 0);
      return tb - ta;
    });

    return filtered;
  }, [signals, hideWideSpreads, maxSpreadBps, hide1MinSignals]);
}