// Enhanced signal quality filtering and scoring system
// Implements the improved two-stage gate + execution-realistic scoring

export type EnhancedSignal = {
  id: string;
  token: string;
  direction: 'Buy' | 'Sell' | 'BUY' | 'SELL';
  score?: number;           // model confidence 0..1
  confidence_score?: number;
  rr?: number;             // risk:reward ratio
  risk_reward_ratio?: number;
  spread_bps?: number;     // spread in basis points
  atrPct?: number;         // ATR percentage
  trendFit?: number;       // trend alignment 0..1
  pullbackFit?: number;    // pullback structure fit 0..1
  orderbook_usdt?: number; // orderbook depth in USDT
  timeframe?: string;
  entry_price?: number;
  take_profit?: number;
  stop_loss?: number;
  ts?: number | string;
  created_at?: string;
  volume_strength?: number;
  signal_strength?: string;
  risk_level?: string;
  [key: string]: any; // Allow other properties
};

export type GateOptions = {
  minDepth: number;        // Min orderbook depth in USDT
  maxSpreadBps: number;    // Max spread in basis points
  ban1m: boolean;          // Exclude 1-minute timeframes
  minRR: number;           // Minimum risk:reward ratio
  minSymbolWR: number;     // Minimum symbol win rate
  excludeInnovationZone: boolean; // Exclude innovation zone pairs
};

export const DEFAULT_GATE_OPTIONS: GateOptions = {
  minDepth: 1000,
  maxSpreadBps: 15,
  ban1m: true,
  minRR: 1.8,
  minSymbolWR: 0.55,
  excludeInnovationZone: true
};

// Innovation zone pairs (typically illiquid and volatile)
const INNOVATION_ZONE_PAIRS = [
  'AKRO', 'ALICE', 'ALPACA', 'ALPINE', 'AUCTION', 'AUDIO', 'BADGER', 'BAKE',
  'BETA', 'BICO', 'BOND', 'BSW', 'BURGER', 'C98', 'CHESS', 'CHR', 'CITY',
  'CKB', 'COCOS', 'COTI', 'CREAM', 'CTK', 'CTXC', 'CVP', 'DEGO', 'DOCK',
  'DODO', 'DREP', 'EASY', 'EPS', 'ERN', 'FIRO', 'FIS', 'FOR', 'FRONT',
  'GHST', 'HARD', 'HBAR', 'HIVE', 'IDEX', 'ILV', 'JOE', 'KAVA', 'KEY',
  'LAZIO', 'LINA', 'LIT', 'LOKA', 'LOOKS', 'LOOM', 'LPT', 'LQTY', 'MBL',
  'MDX', 'MEME', 'MIR', 'MLN', 'MOB', 'MOVR', 'MTLX', 'NULS', 'OGN',
  'OM', 'ORN', 'OXT', 'PAXG', 'PEOPLE', 'PERP', 'PHA', 'POLS', 'POND',
  'PORTO', 'PUNDIX', 'PYR', 'QI', 'QUICK', 'RAD', 'RARE', 'REEF', 'REI',
  'REN', 'REP', 'REQ', 'RGT', 'RIF', 'RLC', 'RUNE', 'SAFE', 'SANTOS',
  'SCRT', 'SFP', 'SHIB', 'SLP', 'SNT', 'SNX', 'SPELL', 'SRM', 'STMX',
  'STORJ', 'STPT', 'STRAX', 'SUN', 'SUPER', 'SUSHI', 'SXP', 'TORN',
  'TRIBE', 'TRU', 'TVK', 'TWT', 'UNFI', 'UNI', 'UTK', 'VET', 'VOXEL',
  'VTHO', 'WAXP', 'WIN', 'WING', 'WRX', 'XVGUSDT', 'YFIUSDT', 'YFIIUSDT'
];

const clamp = (x: number, min = 0, max = 1): number => Math.max(min, Math.min(max, x));

function isInnovationZone(token: string): boolean {
  const symbol = token.replace('/USDT', '').replace('USDT', '');
  return INNOVATION_ZONE_PAIRS.includes(symbol);
}

// Stage 1: Hard gates - discard signals that fail these criteria
export function passesGate(
  signal: EnhancedSignal, 
  opts: Partial<GateOptions> = {},
  symbolWinRates: Record<string, number> = {}
): boolean {
  const options = { ...DEFAULT_GATE_OPTIONS, ...opts };
  
  // Timeframe gate
  if (options.ban1m && signal.timeframe) {
    const tf = signal.timeframe.toLowerCase();
    if (tf.includes('1m') || tf.includes('1min')) {
      return false;
    }
  }
  
  // Spread gate
  const spread = signal.spread_bps ?? 999;
  if (spread > options.maxSpreadBps) {
    return false;
  }
  
  // Depth gate (if available)
  const depth = signal.orderbook_usdt ?? 0;
  if (depth > 0 && depth < options.minDepth) {
    return false;
  }
  
  // Risk:Reward gate
  const rr = signal.rr ?? signal.risk_reward_ratio ?? 0;
  if (rr < options.minRR) {
    return false;
  }
  
  // Symbol win rate gate (if available)
  const symbolWR = symbolWinRates[signal.token] ?? 1;
  if (symbolWR < options.minSymbolWR) {
    return false;
  }
  
  // Innovation zone gate
  if (options.excludeInnovationZone && isInnovationZone(signal.token)) {
    return false;
  }
  
  return true;
}

// Stage 2: Execution-realistic scoring
export function calculateExecutionScore(signal: EnhancedSignal): number {
  // Model confidence (0..1)
  const conf = signal.score ?? signal.confidence_score ?? 0;
  const confNorm = clamp(conf > 1 ? conf / 100 : conf); // Handle both 0-1 and 0-100 scales
  
  // Risk:Reward normalized (cap at 3)
  const rr = signal.rr ?? signal.risk_reward_ratio ?? 1;
  const rrNorm = clamp(Math.min(rr / 3, 1));
  
  // Spread penalty (0 at 0bps, 1 at max spread)
  const spread = signal.spread_bps ?? 50;
  const sprNorm = clamp(spread / 20); // 0..1 @ 20 bps
  
  // Liquidity score (0..1 @ target depth)
  const depth = signal.orderbook_usdt ?? 500;
  const liqNorm = clamp(depth / 2000); // 0..1 @ 2k USDT
  
  // Volatility factor (ATR percentage)
  const atr = signal.atrPct ?? 2;
  const volNorm = clamp(atr / 3); // normalize to 0..1
  
  // Regime fit (trend/pullback alignment)
  const trendFit = signal.trendFit ?? 0;
  const pullbackFit = signal.pullbackFit ?? 0;
  const regimeFit = 0.2 * clamp(trendFit) + 0.2 * clamp(pullbackFit);
  
  // Execution penalty (higher when spread high & depth low)
  const execPenalty = 0.35 * sprNorm + 0.25 * (1 - liqNorm);
  
  // Enhanced composite score
  const composite = 0.55 * confNorm +     // Model confidence (55%)
                   0.20 * rrNorm +        // Risk:Reward (20%)
                   0.15 * regimeFit -     // Regime fit (15%)
                   0.10 * execPenalty;    // Execution penalty (-10%)
  
  return clamp(composite);
}

// Grade assignment based on execution score
export function getExecutionGrade(score: number): 'A+' | 'A' | 'B' | 'C' {
  if (score >= 0.90) return 'A+';
  if (score >= 0.80) return 'A';
  if (score >= 0.65) return 'B';
  return 'C';
}

// Main filtering and ranking function
export function filterAndRankSignals(
  signals: EnhancedSignal[],
  gateOptions: Partial<GateOptions> = {},
  symbolWinRates: Record<string, number> = {}
): (EnhancedSignal & { _score: number; _grade: 'A+' | 'A' | 'B' | 'C' })[] {
  return signals
    .filter(signal => passesGate(signal, gateOptions, symbolWinRates))
    .map(signal => {
      const _score = calculateExecutionScore(signal);
      const _grade = getExecutionGrade(_score);
      return { ...signal, _score, _grade };
    })
    .sort((a, b) => {
      // Sort by score descending, then by timestamp descending
      const scoreDiff = b._score - a._score;
      if (Math.abs(scoreDiff) > 1e-6) return scoreDiff;
      
      const aTime = typeof a.ts === 'string' ? Date.parse(a.ts) : (a.ts ?? 0);
      const bTime = typeof b.ts === 'string' ? Date.parse(b.ts) : (b.ts ?? 0);
      return bTime - aTime;
    });
}

// Quick quality check for auto-trading
export function isAutoTradeable(
  signal: EnhancedSignal & { _score: number; _grade: 'A+' | 'A' | 'B' | 'C' }
): boolean {
  // Only A+ and A grades for auto-trading
  if (signal._grade !== 'A+' && signal._grade !== 'A') {
    return false;
  }
  
  // Minimum execution score threshold
  if (signal._score < 0.8) {
    return false;
  }
  
  // Additional safety checks
  const rr = signal.rr ?? signal.risk_reward_ratio ?? 0;
  if (rr < 2.0) {
    return false;
  }
  
  const spread = signal.spread_bps ?? 999;
  if (spread > 15) {
    return false;
  }
  
  return true;
}

// Execution quality estimation
export function getExecutionQuality(signal: EnhancedSignal): {
  estimatedSlippage: number;
  fillOdds: number;
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
} {
  const spread = signal.spread_bps ?? 50;
  const depth = signal.orderbook_usdt ?? 500;
  
  // Estimate slippage based on spread and depth
  const baseSlippage = spread / 10000; // Convert bps to decimal
  const depthFactor = Math.max(0.5, Math.min(2, 1000 / depth));
  const estimatedSlippage = baseSlippage * depthFactor;
  
  // Estimate fill probability
  const fillOdds = Math.max(0.3, Math.min(0.95, (depth / 2000) * (1 - spread / 50)));
  
  // Overall quality assessment
  let quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (estimatedSlippage <= 0.0005 && fillOdds >= 0.9) quality = 'Excellent';
  else if (estimatedSlippage <= 0.001 && fillOdds >= 0.8) quality = 'Good';
  else if (estimatedSlippage <= 0.002 && fillOdds >= 0.6) quality = 'Fair';
  else quality = 'Poor';
  
  return {
    estimatedSlippage: estimatedSlippage * 100, // Return as percentage
    fillOdds,
    quality
  };
}