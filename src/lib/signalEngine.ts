/* ===========================
 * Signal Engine — Final Spec
 * ===========================
 * - Predictive/Confirmed EMA21↔SMA200
 * - Volume Spike filter (≥1.5× avg) (+ optional grind-down for shorts)
 * - Historical Volatility Percentile (HVP) gate
 * - Optional Stoch and DMI/ADX confirmations
 * - Dynamic trailing exits + reverse-cross exits
 * - Confidence & Grades, Cooldown, TTL
 */

///////////////////////////////
// Types & Config
///////////////////////////////

export type Timeframe = "5m" | "15m" | "1h" | "4h";

export interface Candle {
  time: number;       // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolInput {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[]; // sorted ASC by time
}

export interface Options {
  USE_STOCH?: boolean;
  USE_DMI?: boolean;
  ENABLE_SHORT_GRIND?: boolean; // allow low-volume grind-down shorts w/ strict guards
  SIGNAL_COOLDOWN_HOURS?: number;
  PREDICTIVE_BUFFER?: number;   // e.g. 0.001 (0.1%)
  EMA_FAST?: number;            // default 21
  SMA_SLOW?: number;            // default 200
  VOLUME_PERIOD?: number;       // default 20
  VOLUME_SPIKE_RATIO?: number;  // default 1.5
  HVP_LOOKBACK?: number;        // default 252
  HVP_HV_PERIOD?: number;       // default 20 (HV over 20 bars, annualized)
  STOCH_K?: number;             // default 14
  STOCH_D?: number;             // default 3
  DMI_PERIOD?: number;          // default 14
  ADX_THRESHOLD?: number;       // default 20
  ATR_PERIOD?: number;          // default 14
  TRAIL_ATR_MULT?: number;      // default 2.0
  BREAKEVEN_ATR?: number;       // default 1.0
}

export type Direction = "LONG" | "SHORT";

export interface Signal {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  time: number;
  direction: Direction;
  kind: "ENTRY" | "EXIT";
  reason: string; // e.g., "PreCross", "Cross", "ReverseCross", "TrailingStop"
  price: number;
  confidence?: number;  // 70..95
  grade?: "A+" | "A" | "B" | "C";
  meta?: Record<string, any>;
}

export interface PositionState {
  direction: Direction;
  entryPrice: number;
  highestCloseSinceEntry: number;
  lowestCloseSinceEntry: number;
  trailingStop: number;
}

///////////////////////////////
// Defaults
///////////////////////////////

const DEFAULTS: Required<Options> = {
  USE_STOCH: true,
  USE_DMI: true,
  ENABLE_SHORT_GRIND: true,
  SIGNAL_COOLDOWN_HOURS: 2,
  PREDICTIVE_BUFFER: 0.001,
  EMA_FAST: 21,
  SMA_SLOW: 200,
  VOLUME_PERIOD: 20,
  VOLUME_SPIKE_RATIO: 1.5,
  HVP_LOOKBACK: 252,
  HVP_HV_PERIOD: 20,
  STOCH_K: 14,
  STOCH_D: 3,
  DMI_PERIOD: 14,
  ADX_THRESHOLD: 20,
  ATR_PERIOD: 14,
  TRAIL_ATR_MULT: 2.0,
  BREAKEVEN_ATR: 1.0,
};

///////////////////////////////
// In-memory Cooldown & Positions (replace with your store)
///////////////////////////////

const cooldownMap = new Map<string, number>(); // key -> lastFiredMs
const positions = new Map<string, PositionState>(); // symbol+timeframe -> state

function cooldownKey(symbol: string, tf: Timeframe, dir: Direction) {
  return `${symbol}:${tf}:${dir}`;
}

function recentlyFired(key: string, cooldownHours: number, now: number) {
  const last = cooldownMap.get(key) ?? 0;
  return now - last < cooldownHours * 3600_000;
}
function setFired(key: string, now: number) {
  cooldownMap.set(key, now);
}

///////////////////////////////
// Math & Indicators
///////////////////////////////

function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out.push(sum / period);
    else out.push(NaN);
  }
  return out;
}

function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const alpha = 2 / (period + 1);
  let prev = values[0];
  out[0] = prev;
  for (let i = 1; i < values.length; i++) {
    const e = prev + alpha * (values[i] - prev);
    out[i] = e;
    prev = e;
  }
  return out;
}

function trSeries(c: Candle[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (i === 0) tr[i] = c[i].high - c[i].low;
    else {
      const prevClose = c[i - 1].close;
      tr[i] = Math.max(
        c[i].high - c[i].low,
        Math.abs(c[i].high - prevClose),
        Math.abs(c[i].low - prevClose)
      );
    }
  }
  return tr;
}

function atrSeries(c: Candle[], period: number): number[] {
  return ema(trSeries(c), period);
}

function stochKD(c: Candle[], kPeriod: number, dPeriod: number): { K: number[]; D: number[] } {
  const K: number[] = new Array(c.length).fill(NaN);
  const D: number[] = new Array(c.length).fill(NaN);
  for (let i = 0; i < c.length; i++) {
    const start = i - kPeriod + 1;
    if (start < 0) continue;
    let hh = -Infinity, ll = Infinity;
    for (let j = start; j <= i; j++) {
      hh = Math.max(hh, c[j].high);
      ll = Math.min(ll, c[j].low);
    }
    const denom = hh - ll;
    if (denom === 0) {
      K[i] = 50;
    } else {
      K[i] = ((c[i].close - ll) / denom) * 100;
    }
  }
  const Darr = sma(K.map(v => (isFinite(v) ? v : NaN)), dPeriod);
  for (let i = 0; i < c.length; i++) D[i] = Darr[i];
  return { K, D };
}

function dmiAdx(c: Candle[], period: number): { plusDI: number[]; minusDI: number[]; adx: number[] } {
  const len = c.length;
  const plusDM: number[] = new Array(len).fill(0);
  const minusDM: number[] = new Array(len).fill(0);
  for (let i = 1; i < len; i++) {
    const upMove = c[i].high - c[i - 1].high;
    const downMove = c[i - 1].low - c[i].low;
    plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
    minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
  }
  const tr = trSeries(c);
  const trEMA = ema(tr, period);
  const plusDM_EMA = ema(plusDM, period);
  const minusDM_EMA = ema(minusDM, period);

  const plusDI: number[] = plusDM_EMA.map((v, i) => (trEMA[i] ? (v / trEMA[i]) * 100 : NaN));
  const minusDI: number[] = minusDM_EMA.map((v, i) => (trEMA[i] ? (v / trEMA[i]) * 100 : NaN));
  const dx: number[] = plusDI.map((p, i) => {
    const m = minusDI[i];
    const denom = (p + m);
    return denom ? (Math.abs(p - m) / denom) * 100 : NaN;
  });
  const adx = ema(dx.map(d => (isFinite(d) ? d : 0)), period);
  return { plusDI, minusDI, adx };
}

function annualizedHV(returns: number[]): number {
  // stddev of returns * sqrt(252)
  const n = returns.length;
  if (n === 0) return NaN;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((s, r) => s + (r - mean) * (r - mean), 0) / n;
  return Math.sqrt(variance * 252);
}

function hvSeries(c: Candle[], period: number): number[] {
  const lnRet: number[] = [];
  for (let i = 1; i < c.length; i++) {
    lnRet[i] = Math.log(c[i].close / c[i - 1].close);
  }
  const out: number[] = new Array(c.length).fill(NaN);
  for (let i = 0; i < c.length; i++) {
    const start = i - period + 1;
    if (start < 1) continue;
    const slice = lnRet.slice(start, i + 1).filter(v => isFinite(v));
    out[i] = annualizedHV(slice);
  }
  return out;
}

function percentileRank(lastN: number[], value: number): number {
  const arr = lastN.filter(v => isFinite(v)).slice(-lastN.length);
  if (!arr.length || !isFinite(value)) return NaN;
  const less = arr.filter(x => x < value).length;
  return (less / arr.length) * 100;
}

function crossesUp(aPrev: number, aNow: number, bPrev: number, bNow: number) {
  return aPrev <= bPrev && aNow > bNow;
}
function crossesDown(aPrev: number, aNow: number, bPrev: number, bNow: number) {
  return aPrev >= bPrev && aNow < bNow;
}

///////////////////////////////
// Confidence & Grading
///////////////////////////////

function computeConfidence(
  volumeRatio: number,
  hvp: number,
  stochConfirmed: boolean,
  dmiConfirmed: boolean,
  usedPreCross: boolean
): { confidence: number; grade: "A+" | "A" | "B" | "C" } {
  let conf = 70;
  conf += Math.min(15, Math.max(0, (volumeRatio - 1.5) * 10));     // + up to 15
  conf += Math.min(10, Math.max(0, (hvp - 50) / 5));               // + up to 10
  if (stochConfirmed) conf += 3;
  if (dmiConfirmed) conf += 2;
  if (usedPreCross && volumeRatio >= 1.5 && hvp >= 50) conf += 5;   // timeliness bonus
  conf = Math.max(70, Math.min(95, Math.round(conf)));
  let grade: "A+" | "A" | "B" | "C";
  if (conf >= 90) grade = "A+";
  else if (conf >= 85) grade = "A";
  else if (conf >= 80) grade = "B";
  else grade = "C";
  return { confidence: conf, grade };
}

///////////////////////////////
// Engine
///////////////////////////////

export function generateSignals(
  input: SymbolInput,
  opts: Options = {}
): Signal[] {
  const o = { ...DEFAULTS, ...opts };
  const { candles, symbol, timeframe } = input;
  const out: Signal[] = [];
  if (candles.length < Math.max(o.SMA_SLOW + 2, o.HVP_LOOKBACK + 5)) return out;

  // Series
  const closes = candles.map(c => c.close);
  const vols   = candles.map(c => c.volume);
  const ema21  = ema(closes, o.EMA_FAST);
  const sma200 = sma(closes, o.SMA_SLOW);
  const atr    = atrSeries(candles, o.ATR_PERIOD);
  const K_D    = stochKD(candles, o.STOCH_K, o.STOCH_D);
  const dmi    = dmiAdx(candles, o.DMI_PERIOD);
  const hv20   = hvSeries(candles, o.HVP_HV_PERIOD);

  // HVP per bar using last 252 HV observations
  const hvp: number[] = new Array(candles.length).fill(NaN);
  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(0, i - o.HVP_LOOKBACK + 1);
    const hvHistory = hv20.slice(start, i + 1).filter(v => isFinite(v));
    hvp[i] = hvHistory.length ? percentileRank(hvHistory, hv20[i]) : NaN;
  }

  // Volume SMA
  const volAvg = sma(vols, o.VOLUME_PERIOD);

  // Work on the last bar (you can also emit historical)
  const i = candles.length - 1;
  const now = candles[i].time;
  const price = closes[i];
  const pricePrev = closes[i - 1];

  const emaPrev = ema21[i - 1];
  const emaNow  = ema21[i];
  const smaPrev = sma200[i - 1];
  const smaNow  = sma200[i];

  const volRatio = vols[i] / volAvg[i];
  const volumeSpike = volRatio > o.VOLUME_SPIKE_RATIO;

  const hvpNow = hvp[i];
  const hvpSma20 = sma(hvp.map(x => (isFinite(x) ? x : NaN)), 20)[i];
  const hvOk = (hvpNow > 50) || (isFinite(hvpSma20) && hvpNow > hvpSma20);

  const Kprev = K_D.K[i - 1], Know = K_D.K[i];
  const Dprev = K_D.D[i - 1], Dnow = K_D.D[i];
  const stochBull = crossesUp(Kprev, Know, Dprev, Dnow) && Know < 80;
  const stochBear = crossesDown(Kprev, Know, Dprev, Dnow) && Know > 20;

  const plusPrev = dmi.plusDI[i - 1], plusNow = dmi.plusDI[i];
  const minusPrev = dmi.minusDI[i - 1], minusNow = dmi.minusDI[i];
  const adxNow = dmi.adx[i];
  const dmiBull = (plusNow > minusNow) && adxNow > o.ADX_THRESHOLD;
  const dmiBear = (minusNow > plusNow) && adxNow > o.ADX_THRESHOLD;

  // Cross logic
  const bullishCross = (emaNow > smaNow) && (emaPrev <= smaPrev);
  const bearishCross = (emaNow < smaNow) && (emaPrev >= smaPrev);

  // Predictive required cross price for next bar (using rolling formula)
  const alpha = 2 / (o.EMA_FAST + 1);
  const closeRollingOut = candles[i - (o.SMA_SLOW - 1)]?.close ?? closes[i]; // close leaving the 200-window next bar
  const requiredCrossPrice =
    (emaPrev * alpha + smaPrev + (closeRollingOut / o.SMA_SLOW)) / (alpha + 1 / o.SMA_SLOW);

  const buffer = o.PREDICTIVE_BUFFER;
  const distanceNow = emaNow - smaNow;
  const distancePrev = emaPrev - smaPrev;

  const convergenceUp = (distanceNow - distancePrev) > 0;          // narrowing upward
  const convergenceDown = (distancePrev - distanceNow) > 0;        // widening downward

  const bullishPreCross =
    (emaNow <= smaNow) && convergenceUp && (price >= requiredCrossPrice * (1 - buffer));

  const bearishPreCross =
    (emaNow >= smaNow) && convergenceDown && (price <= requiredCrossPrice * (1 + buffer));

  // Volume logic for shorts (allow grind-down if enabled)
  const shortVolumeOk = o.ENABLE_SHORT_GRIND
    ? (volRatio > o.VOLUME_SPIKE_RATIO) || ((volRatio < 0.8) && dmiBear && hvOk)
    : (volRatio > o.VOLUME_SPIKE_RATIO);

  // Optional confirmations
  const okStochBull = o.USE_STOCH ? stochBull : true;
  const okStochBear = o.USE_STOCH ? stochBear : true;
  const okDmiBull   = o.USE_DMI ? dmiBull : true;
  const okDmiBear   = o.USE_DMI ? dmiBear : true;

  // Cooldown
  const keyLong = cooldownKey(symbol, timeframe, "LONG");
  const keyShort = cooldownKey(symbol, timeframe, "SHORT");
  const allowLong = !recentlyFired(keyLong, o.SIGNAL_COOLDOWN_HOURS, now);
  const allowShort = !recentlyFired(keyShort, o.SIGNAL_COOLDOWN_HOURS, now);

  // Entries
  const longCandidate =
    (bullishPreCross || bullishCross) && volumeSpike && hvOk && okStochBull && okDmiBull && allowLong;

  const shortCandidate =
    (bearishPreCross || bearishCross) && shortVolumeOk && hvOk && okStochBear && okDmiBear && allowShort;

  // Confidence
  const usedPreCrossLong = bullishPreCross && !bullishCross;
  const usedPreCrossShort = bearishPreCross && !bearishCross;

  if (longCandidate) {
    const { confidence, grade } = computeConfidence(volRatio, hvpNow, stochBull, dmiBull, usedPreCrossLong);
    out.push({
      id: `${symbol}:${timeframe}:${now}:LONG:ENTRY`,
      symbol, timeframe, time: now,
      direction: "LONG",
      kind: "ENTRY",
      reason: usedPreCrossLong ? "PreCross" : "Cross",
      price,
      confidence, grade,
      meta: {
        volumeRatio: volRatio,
        hvp: hvpNow,
        adx: adxNow,
        requiredCrossPrice,
      }
    });
    setFired(keyLong, now);

    // Initialize / update position tracking
    const posKey = `${symbol}:${timeframe}`;
    positions.set(posKey, {
      direction: "LONG",
      entryPrice: price,
      highestCloseSinceEntry: price,
      lowestCloseSinceEntry: price,
      trailingStop: price - (atr[i] * o.TRAIL_ATR_MULT),
    });
  }

  if (shortCandidate) {
    const { confidence, grade } = computeConfidence(volRatio, hvpNow, stochBear, dmiBear, usedPreCrossShort);
    out.push({
      id: `${symbol}:${timeframe}:${now}:SHORT:ENTRY`,
      symbol, timeframe, time: now,
      direction: "SHORT",
      kind: "ENTRY",
      reason: usedPreCrossShort ? "PreCross" : "Cross",
      price,
      confidence, grade,
      meta: {
        volumeRatio: volRatio,
        hvp: hvpNow,
        adx: adxNow,
        requiredCrossPrice,
      }
    });
    setFired(keyShort, now);

    const posKey = `${symbol}:${timeframe}`;
    positions.set(posKey, {
      direction: "SHORT",
      entryPrice: price,
      highestCloseSinceEntry: price,
      lowestCloseSinceEntry: price,
      trailingStop: price + (atr[i] * o.TRAIL_ATR_MULT),
    });
  }

  // Exits / trailing updates if a position is open
  const posKey = `${symbol}:${timeframe}`;
  if (positions.has(posKey)) {
    const s = positions.get(posKey)!;
    // update extremes
    s.highestCloseSinceEntry = Math.max(s.highestCloseSinceEntry, price);
    s.lowestCloseSinceEntry  = Math.min(s.lowestCloseSinceEntry, price);

    // trailing + reversal
    if (s.direction === "LONG") {
      // trailing
      const trailCandidate = s.highestCloseSinceEntry - atr[i] * o.TRAIL_ATR_MULT;
      s.trailingStop = Math.max(s.trailingStop, trailCandidate);
      // breakeven step
      if (price - s.entryPrice >= atr[i] * o.BREAKEVEN_ATR) {
        s.trailingStop = Math.max(s.trailingStop, s.entryPrice);
      }
      // exits
      const hitTrail = price <= s.trailingStop;
      const reverseCross = bearishCross;
      if (hitTrail || reverseCross) {
        out.push({
          id: `${symbol}:${timeframe}:${now}:LONG:EXIT`,
          symbol, timeframe, time: now,
          direction: "LONG",
          kind: "EXIT",
          reason: reverseCross ? "ReverseCross" : "TrailingStop",
          price,
        });
        positions.delete(posKey);
      }
    } else if (s.direction === "SHORT") {
      const trailCandidate = s.lowestCloseSinceEntry + atr[i] * o.TRAIL_ATR_MULT;
      s.trailingStop = Math.min(s.trailingStop, trailCandidate);
      if (s.entryPrice - price >= atr[i] * o.BREAKEVEN_ATR) {
        s.trailingStop = Math.min(s.trailingStop, s.entryPrice);
      }
      const hitTrail = price >= s.trailingStop;
      const reverseCross = bullishCross;
      if (hitTrail || reverseCross) {
        out.push({
          id: `${symbol}:${timeframe}:${now}:SHORT:EXIT`,
          symbol, timeframe, time: now,
          direction: "SHORT",
          kind: "EXIT",
          reason: reverseCross ? "ReverseCross" : "TrailingStop",
          price,
        });
        positions.delete(posKey);
      }
    }
  }

  return out;
}

///////////////////////////////
// Scanner pre-filter (fast)
///////////////////////////////

export function scanCandidates(input: SymbolInput, opts: Options = {}): { symbol: string; score: number } | null {
  const o = { ...DEFAULTS, ...opts };
  const { candles, symbol } = input;
  if (candles.length < o.SMA_SLOW + 5) return null;

  const closes = candles.map(c => c.close);
  const vols = candles.map(c => c.volume);
  const ema21 = ema(closes, o.EMA_FAST);
  const sma200 = sma(closes, o.SMA_SLOW);
  const hv20 = hvSeries(candles, o.HVP_HV_PERIOD);
  const i = candles.length - 1;

  const volAvg = sma(vols, o.VOLUME_PERIOD);
  const volRatio = vols[i] / volAvg[i];

  // HVP now
  const start = Math.max(0, i - o.HVP_LOOKBACK + 1);
  const hvHist = hv20.slice(start, i + 1).filter(v => isFinite(v));
  const hvpNow = hvHist.length ? percentileRank(hvHist, hv20[i]) : 0;

  const nearCross = Math.abs((ema21[i] - sma200[i]) / closes[i]) < 0.01; // within 1%
  const crossed = (ema21[i] > sma200[i] && ema21[i - 1] <= sma200[i - 1]) ||
                  (ema21[i] < sma200[i] && ema21[i - 1] >= sma200[i - 1]);

  const eligible = (nearCross || crossed) && (volRatio > 1.2) && (hvpNow > 50);
  if (!eligible) return null;

  let score = 0;
  if (Math.abs((ema21[i] - sma200[i]) / closes[i]) < 0.005) score += 20;
  if (volRatio > 1.5) score += 20;
  if (hvpNow > 60) score += 10;
  return { symbol, score };
}

///////////////////////////////
// TTL helper (hook this into your scheduler)
///////////////////////////////

export const SIGNAL_TTL_SECONDS: Record<Timeframe, number> = {
  "5m": 5 * 60,
  "15m": 15 * 60,
  "1h": 60 * 60,
  "4h": 240 * 60,
};