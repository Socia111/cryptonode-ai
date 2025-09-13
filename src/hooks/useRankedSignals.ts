import { useMemo } from 'react';
import { UISignal, compositeScore, gradeFromComposite } from '@/lib/signalScoring';
import { filterAndRankSignals, DEFAULT_GATE_OPTIONS, type EnhancedSignal, type GateOptions } from '@/lib/signalQuality';
import { isInnovationZonePair } from '@/lib/innovationZone';

type Options = {
  // Legacy options (for backwards compatibility)
  hideWideSpreads?: boolean;
  maxSpreadBps?: number;
  hide1MinSignals?: boolean;
  excludeInnovationZone?: boolean;
  
  // Enhanced options
  useEnhancedScoring?: boolean;  // Use new execution-realistic scoring
  minDepth?: number;             // Min orderbook depth in USDT
  minRR?: number;                // Min risk:reward ratio
  enhancedGateOptions?: Partial<GateOptions>;
};

export function useRankedSignals(signals: UISignal[], opts?: Options) {
  const { 
    hideWideSpreads = true, 
    maxSpreadBps = 20, 
    hide1MinSignals = false, 
    excludeInnovationZone = true,
    useEnhancedScoring = true,  // Default to enhanced scoring
    minDepth = 1000,
    minRR = 1.8,
    enhancedGateOptions = {}
  } = opts ?? {};

  return useMemo(() => {
    if (!signals || signals.length === 0) return [];

    // Use enhanced scoring if enabled
    if (useEnhancedScoring) {
      const gateOptions = {
        ...DEFAULT_GATE_OPTIONS,
        maxSpreadBps: hideWideSpreads ? maxSpreadBps : 999,
        ban1m: hide1MinSignals,
        excludeInnovationZone,
        minDepth,
        minRR,
        ...enhancedGateOptions
      };

      // Convert UISignal to EnhancedSignal format
      const enhancedSignals: EnhancedSignal[] = signals.map(s => ({
        ...s,
        ts: s.ts || s.created_at,
        // Add any missing fields with defaults
        spread_bps: s.spread_bps ?? (s.spread ? s.spread * 100 : undefined),
        rr: s.rr ?? s.risk_reward_ratio,
      }));

      return filterAndRankSignals(enhancedSignals, gateOptions);
    }

    // Legacy scoring (backwards compatibility)
    const mapped = signals.map((s) => {
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

    // Priority (score) sort by default; most recent tie-breaker if timestamps exist
    filtered.sort((a, b) => {
      const diff = (b as any)._score - (a as any)._score;
      if (Math.abs(diff) > 1e-6) return diff;
      const ta = typeof a.ts === 'string' ? Date.parse(a.ts) : (a.ts ?? 0);
      const tb = typeof b.ts === 'string' ? Date.parse(b.ts) : (b.ts ?? 0);
      return tb - ta;
    });

    return filtered;
  }, [signals, hideWideSpreads, maxSpreadBps, hide1MinSignals, excludeInnovationZone, useEnhancedScoring, minDepth, minRR, enhancedGateOptions]);
}