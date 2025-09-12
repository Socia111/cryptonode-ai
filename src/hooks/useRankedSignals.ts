import { useMemo } from 'react';
import { UISignal, compositeScore, gradeFromComposite } from '@/lib/signalScoring';

type Options = {
  hideWideSpreads?: boolean;  // if true, hide spread > 20 bps
  maxSpreadBps?: number;      // default 20
};

export function useRankedSignals(signals: UISignal[], opts?: Options) {
  const { hideWideSpreads = true, maxSpreadBps = 20 } = opts ?? {};

  return useMemo(() => {
    const mapped = (signals || []).map((s) => {
      const score = compositeScore(s);
      const grade = gradeFromComposite(score);
      return { ...s, _score: score, _grade: grade } as UISignal & { _score: number; _grade: ReturnType<typeof gradeFromComposite> };
    });

    const filtered = hideWideSpreads
      ? mapped.filter(s => (s.spread_bps ?? 0) <= maxSpreadBps)
      : mapped;

    // ⭐ Priority (score) sort by default; most recent tie-breaker if timestamps exist
    filtered.sort((a, b) => {
      const diff = (b as any)._score - (a as any)._score;
      if (Math.abs(diff) > 1e-6) return diff;
      const ta = typeof a.ts === 'string' ? Date.parse(a.ts) : (a.ts ?? 0);
      const tb = typeof b.ts === 'string' ? Date.parse(b.ts) : (b.ts ?? 0);
      return tb - ta;
    });

    return filtered;
  }, [signals, hideWideSpreads, maxSpreadBps]);
}