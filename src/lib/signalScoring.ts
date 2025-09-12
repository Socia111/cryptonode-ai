// Lightweight scorer: blends model confidence + R:R + small spread penalty.
// No backend changes; UI-only ranking.

export type UISignal = {
  id: string;
  token: string;          // e.g. "BTCUSDT"
  direction: 'Buy' | 'Sell' | 'BUY' | 'SELL';
  score?: number;         // model confidence 0..1 (if available)
  confidence_score?: number; // alt naming 0..1 (if available)
  rr?: number;            // risk:reward, e.g. 2.0
  risk_reward_ratio?: number;
  spread_bps?: number;    // optional
  entry_price?: number;
  take_profit?: number;
  stop_loss?: number;
  exit_target?: number;   // support for existing signals
  ts?: string | number;
  created_at?: string;    // support for existing signals
  timeframe?: string;     // support for existing signals
  spread?: number;        // support for existing signals
  edgeScore?: number;     // support for existing signals
  grade?: 'A+' | 'A' | 'B' | 'C'; // support for existing signals
};

export function to0to1(v: number | undefined | null, fallback = 0): number {
  if (v == null || Number.isNaN(Number(v))) return fallback;
  const n = Number(v);
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function pickScore(s: UISignal): number {
  // prefer score, then confidence_score; assume already 0..1 if present
  if (typeof s.score === 'number') return to0to1(s.score);
  if (typeof s.confidence_score === 'number') return to0to1(s.confidence_score);
  return 0;
}

export function pickRR(s: UISignal): number {
  const rr = (typeof s.rr === 'number') ? s.rr : (typeof s.risk_reward_ratio === 'number' ? s.risk_reward_ratio : 1);
  return Math.max(0, rr);
}

export function gradeFromComposite(x: number): 'A+'|'A'|'B'|'C' {
  if (x >= 0.90) return 'A+';
  if (x >= 0.80) return 'A';
  if (x >= 0.65) return 'B';
  return 'C';
}

/**
 * Composite score:
 *   70% model confidence + 25% normalized R:R (capped at 3) - 5% spread penalty
 * Result 0..1
 */
export function compositeScore(s: UISignal): number {
  const conf = pickScore(s);               // 0..1
  const rr   = Math.min(pickRR(s) / 3, 1); // normalize R:R into 0..1 (cap at 3)
  const spr  = (s.spread_bps ?? 0) / 100;  // 100 bps = 1%
  const raw  = 0.70 * conf + 0.25 * rr - 0.05 * spr;
  return Math.max(0, Math.min(1, raw));
}