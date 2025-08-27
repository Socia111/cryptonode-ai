import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Canonical AItradeX1 Configuration
const AITRADEX1_CONFIG = {
  name: "AItradeX1",
  version: "1.0.0",
  inputs: {
    emaLen: 21,
    smaLen: 200,
    adxThreshold: 28,
    stochLength: 14,
    stochSmoothK: 3,
    stochSmoothD: 3,
    volSpikeMult: 1.7,
    obvEmaLen: 21,
    hvpLower: 55,
    hvpUpper: 85,
    breakoutLen: 5,
    spreadMaxPct: 0.10,
    atrLen: 14,
    exitBars: 18,
    useDailyTrendFilter: true
  },
  relaxedMode: {
    adxThreshold: 22,
    volSpikeMult: 1.4,
    hvpLower: 50,
    hvpUpper: 90,
    breakoutLen: 3,
    useDailyTrendFilter: false
  },
  scoreBuckets: ["trend","adx","dmi","stoch","volume","obv","hvp","spread"]
} as const;

interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Indicators {
  ema21: number[];
  sma200: number[];
  adx: number[];
  diPlus: number[];
  diMinus: number[];
  stoch_k: number[];
  stoch_d: number[];
  obv: number[];
  obv_ema21: number[];
  hvp: number[];
  volume: number[];
  vol_sma21: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  atr: number[];
}

// Helper functions for array safety
const has = (a?: number[], n = 1) => Array.isArray(a) && a.length >= n;
const last = (a: number[]) => a[a.length - 1];
const ago = (a: number[], n: number) => a[a.length - 1 - n];

function getTakeProfitATR(hvp: number): number {
  if (hvp > 75) return 3.5;
  if (hvp > 65) return 3.0;
  return 2.5;
}

// Mathematical indicator calculations
function calculateSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = values.slice(i - period + 1, i + 1);
      result.push(slice.reduce((sum, val) => sum + val, 0) / period);
    }
  }
  return result;
}

function calculateEMA(values: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      result.push(values[i]);
    } else {
      result.push((values[i] * multiplier) + (result[i-1] * (1 - multiplier)));
    }
  }
  return result;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }
  return [NaN, ...calculateSMA(trs, period).slice(period - 1)];
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number): { k: number[], d: number[] } {
  const kValues: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(NaN);
    } else {
      const periodHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const periodLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      const k = ((closes[i] - periodLow) / (periodHigh - periodLow)) * 100;
      kValues.push(k);
    }
  }
  
  const dValues = calculateSMA(kValues, 3);
  return { k: kValues, d: dValues };
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): { adx: number[], diPlus: number[], diMinus: number[] } {
  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  const tr: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
    
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  
  const smaDmPlus = calculateSMA(dmPlus, period);
  const smaDmMinus = calculateSMA(dmMinus, period);
  const smaTr = calculateSMA(tr, period);
  
  const diPlus = smaDmPlus.map((val, i) => (val / smaTr[i]) * 100);
  const diMinus = smaDmMinus.map((val, i) => (val / smaTr[i]) * 100);
  
  const dx = diPlus.map((val, i) => {
    const sum = val + diMinus[i];
    return sum === 0 ? 0 : Math.abs(val - diMinus[i]) / sum * 100;
  });
  
  const adx = calculateSMA(dx, period);
  
  return {
    adx: [NaN, ...adx],
    diPlus: [NaN, ...diPlus],
    diMinus: [NaN, ...diMinus]
  };
}

function calculateHVP(closes: number[]): number[] {
  const returns = closes.slice(1).map((price, i) => (price - closes[i]) / closes[i]);
  const hvpValues: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < 21) {
      hvpValues.push(NaN);
    } else {
      const recentReturns = returns.slice(Math.max(0, i - 21), i);
      const sigma21 = Math.sqrt(recentReturns.reduce((sum, r) => sum + r * r, 0) / recentReturns.length) * Math.sqrt(252);
      
      const lookback252 = Math.min(252, i);
      const longReturns = returns.slice(Math.max(0, i - lookback252), i);
      const maxSigma = Math.max(...longReturns.map(r => Math.abs(r))) * Math.sqrt(252);
      
      const hvp = maxSigma > 0 ? Math.min(100, (sigma21 / maxSigma) * 100) : 0;
      hvpValues.push(hvp);
    }
  }
  return hvpValues;
}

function calculateOBV(closes: number[], volumes: number[]): number[] {
  const obvValues: number[] = [0]; // First value is 0
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obvValues.push(obvValues[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      obvValues.push(obvValues[i - 1] - volumes[i]);
    } else {
      obvValues.push(obvValues[i - 1]);
    }
  }
  return obvValues;
}

// Fetch real market data from Binance API
async function fetchRealMarketData(symbol: string, timeframe: string = '1h', limit: number = 500): Promise<OHLCVData[]> {
  try {
    const interval = timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1h';
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.map((candle: any[]) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return [];
  }
}

function computeAllIndicators(ohlcv: OHLCVData[], cfg: any): Indicators | null {
  if (ohlcv.length < 300) return null;
  
  const opens = ohlcv.map(d => d.open);
  const highs = ohlcv.map(d => d.high);
  const lows = ohlcv.map(d => d.low);
  const closes = ohlcv.map(d => d.close);
  const volumes = ohlcv.map(d => d.volume);
  
  // Calculate all indicators
  const ema21 = calculateEMA(closes, cfg.emaLen);
  const sma200 = calculateSMA(closes, cfg.smaLen);
  const atr = calculateATR(highs, lows, closes, cfg.atrLen);
  const stoch = calculateStochastic(highs, lows, closes, cfg.stochLength);
  const adxData = calculateADX(highs, lows, closes, 14);
  const hvp = calculateHVP(closes);
  const obv = calculateOBV(closes, volumes);
  const obv_ema21 = calculateEMA(obv, cfg.obvEmaLen);
  const vol_sma21 = calculateSMA(volumes, 21);
  
  return {
    ema21,
    sma200,
    adx: adxData.adx,
    diPlus: adxData.diPlus,
    diMinus: adxData.diMinus,
    stoch_k: stoch.k,
    stoch_d: stoch.d,
    obv,
    obv_ema21,
    hvp,
    volume: volumes,
    vol_sma21,
    open: opens,
    high: highs,
    low: lows,
    close: closes,
    atr
  };
}

function evaluateCanonicalAItradeX1(ind: Indicators, cfg: any): { long: boolean; short: boolean; score: number; filters: any } | null {
  // Minimum history checks
  if (
    !has(ind.close, 210) || !has(ind.ema21, 4) || !has(ind.sma200, 1) ||
    !has(ind.adx, 1) || !has(ind.diPlus, 4) || !has(ind.diMinus, 4) ||
    !has(ind.stoch_k, 1) || !has(ind.stoch_d, 1) ||
    !has(ind.obv, 4) || !has(ind.obv_ema21, 1) ||
    !has(ind.hvp, 1) || !has(ind.volume, 1) || !has(ind.vol_sma21, 1) ||
    !has(ind.high, cfg.breakoutLen + 1) || !has(ind.low, cfg.breakoutLen + 1) ||
    !has(ind.open, 1)
  ) {
    return null;
  }

  const ema21 = last(ind.ema21);
  const ema21_3 = ago(ind.ema21, 3);
  const sma200 = last(ind.sma200);
  const adx = last(ind.adx);
  const diP = last(ind.diPlus);
  const diM = last(ind.diMinus);
  const diP_3 = ago(ind.diPlus, 3);
  const diM_3 = ago(ind.diMinus, 3);
  const k = last(ind.stoch_k);
  const d = last(ind.stoch_d);
  const obv = last(ind.obv);
  const obv_ema = last(ind.obv_ema21);
  const obv_3 = ago(ind.obv, 3);
  const hvp = last(ind.hvp);
  const vol = last(ind.volume);
  const volSma = last(ind.vol_sma21);
  const o = last(ind.open);
  const c = last(ind.close);
  const spreadPct = Math.abs(c - o) / Math.max(1e-12, o) * 100;
  const hhPrev = Math.max(...ind.high.slice(-cfg.breakoutLen - 1, -1));
  const llPrev = Math.min(...ind.low.slice(-cfg.breakoutLen - 1, -1));

  const longFilters = {
    trend: ema21 > sma200 && ema21 > ema21_3,
    adx: adx >= cfg.adxThreshold,
    dmi: diP > diM && diP > diP_3,
    stoch: k > d && k < 35 && d < 40,
    volume: vol > cfg.volSpikeMult * volSma,
    obv: obv > obv_ema && obv > obv_3,
    hvp: hvp >= cfg.hvpLower && hvp <= cfg.hvpUpper,
    spread: spreadPct < cfg.spreadMaxPct,
    breakout: c > hhPrev,
    dailyConfirm: true // Simplified for now
  };

  const shortFilters = {
    trend: ema21 < sma200 && ema21 < ema21_3,
    adx: adx >= cfg.adxThreshold,
    dmi: diM > diP && diM > diM_3,
    stoch: k < d && k > 65 && d > 60,
    volume: vol > cfg.volSpikeMult * volSma,
    obv: obv < obv_ema && obv < obv_3,
    hvp: hvp >= cfg.hvpLower && hvp <= cfg.hvpUpper,
    spread: spreadPct < cfg.spreadMaxPct,
    breakout: c < llPrev,
    dailyConfirm: true
  };

  const longAll = Object.values(longFilters).every(Boolean);
  const shortAll = Object.values(shortFilters).every(Boolean);

  // 8 core buckets for score (exclude dailyConfirm to keep ranking stable)
  const core = (f: Record<string, boolean>) => ({
    trend: f.trend, adx: f.adx, dmi: f.dmi, stoch: f.stoch,
    volume: f.volume, obv: f.obv, hvp: f.hvp, spread: f.spread
  });

  const longScore = Math.min(100, Object.values(core(longFilters)).filter(Boolean).length * 12.5);
  const shortScore = Math.min(100, Object.values(core(shortFilters)).filter(Boolean).length * 12.5);

  return longAll
    ? { long: true, short: false, score: longScore, filters: longFilters }
    : shortAll
    ? { long: false, short: true, score: shortScore, filters: shortFilters }
    : { long: false, short: false, score: 0, filters: {} };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json() : {};
    const relaxed = url.searchParams.get('relaxed_filters') === 'true' || body.relaxed_filters === true;
    const exchange = body.exchange || 'binance';
    const timeframe = body.timeframe || '1h';

    const cfg = relaxed 
      ? { ...AITRADEX1_CONFIG.inputs, ...AITRADEX1_CONFIG.relaxedMode }
      : AITRADEX1_CONFIG.inputs;

    console.log(`🔍 Live AItradeX1 Scanner — Exchange: ${exchange}, TF: ${timeframe}, Relaxed: ${relaxed}`);

    // Major crypto symbols for live scanning
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
      'SOLUSDT', 'DOTUSDT', 'LINKUSDT', 'UNIUSDT', 'LTCUSDT',
      'BCHUSDT', 'XLMUSDT', 'VETUSDT', 'EOSUSDT', 'TRXUSDT',
      'ETCUSDT', 'DASHUSDT', 'ATOMUSDT', 'NEARUSDT', 'AVAXUSDT'
    ];

    const signals: any[] = [];
    const currentTime = new Date().toISOString();

    // Process each symbol for live signals
    for (const symbol of symbols.slice(0, 20)) {
      try {
        console.log(`Processing ${symbol}...`);
        const ohlcv = await fetchRealMarketData(symbol, timeframe);
        
        if (ohlcv.length < 300) {
          console.log(`Insufficient data for ${symbol}: ${ohlcv.length} bars`);
          continue;
        }

        const indicators = computeAllIndicators(ohlcv, cfg);
        if (!indicators) continue;

        const evaluation = evaluateCanonicalAItradeX1(indicators, cfg);
        if (!evaluation || (!evaluation.long && !evaluation.short)) continue;

        const lastCandle = ohlcv[ohlcv.length - 1];
        const barTime = new Date(lastCandle.timestamp);
        const price = lastCandle.close;
        const atr = last(indicators.atr);
        const hvp = last(indicators.hvp);
        const tpATR = getTakeProfitATR(hvp);

        const signal = {
          algo: "AItradeX1",
          symbol,
          exchange,
          timeframe,
          direction: evaluation.long ? 'LONG' : 'SHORT',
          bar_time: barTime.toISOString(),
          price,
          confidence_score: evaluation.score,
          score: evaluation.score,
          atr,
          sl: evaluation.long ? price - 1.5 * atr : price + 1.5 * atr,
          tp: evaluation.long ? price + tpATR * atr : price - tpATR * atr,
          hvp,
          filters: evaluation.filters,
          indicators: {
            adx: last(indicators.adx),
            diPlus: last(indicators.diPlus),
            diMinus: last(indicators.diMinus),
            k: last(indicators.stoch_k),
            d: last(indicators.stoch_d),
            vol_spike: last(indicators.volume) > cfg.volSpikeMult * last(indicators.vol_sma21)
          },
          generated_at: currentTime,
          is_active: true,
          telegram_sent: false,
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
        };

        signals.push(signal);
        console.log(`✅ ${evaluation.long ? 'LONG' : 'SHORT'} signal for ${symbol} (${evaluation.score}%)`);

      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }

    console.log(`Generated ${signals.length} signals`);

    // Store signals in database
    if (signals.length > 0) {
      // Deactivate old signals
      await supabase
        .from('scanner_signals')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new signals with deduplication
      const { error: insertError } = await supabase
        .from('scanner_signals')
        .upsert(signals, { 
          onConflict: 'exchange,symbol,timeframe,direction,bar_time',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
      } else {
        console.log(`✅ Stored ${signals.length} signals in database`);

        // Send high-confidence signals to Telegram
        for (const signal of signals) {
          if (signal.confidence_score >= 75) {
            try {
              const telegramPayload = {
                signal_id: `${signal.exchange}_${signal.symbol}_${Date.now()}`,
                token: signal.symbol.replace('USDT', '').replace('USD', ''),
                direction: signal.direction === 'LONG' ? 'BUY' : 'SELL',
                signal_type: `AITRADEX1_${signal.direction}`,
                entry_price: signal.price,
                exit_target: signal.tp,
                stop_loss: signal.sl,
                leverage: signal.confidence_score >= 85 ? 3 : 2,
                confidence_score: signal.confidence_score,
                roi_projection: 2.5,
                quantum_probability: signal.confidence_score / 100,
                risk_level: signal.confidence_score >= 85 ? 'LOW' : 'MEDIUM',
                signal_strength: signal.confidence_score >= 85 ? 'VERY_STRONG' : 'STRONG',
                trend_projection: signal.direction === 'LONG' ? 'BULLISH_MOMENTUM' : 'BEARISH_MOMENTUM',
                is_premium: signal.confidence_score >= 85
              };

              await supabase.functions.invoke('telegram-bot', {
                body: { signal: telegramPayload }
              });

              console.log(`📤 Sent ${signal.confidence_score}% signal for ${signal.symbol} to Telegram`);

            } catch (telegramError) {
              console.error('Telegram error:', telegramError);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        algorithm: "AItradeX1",
        exchange,
        timeframe,
        relaxed_mode: relaxed,
        signals_generated: signals.length,
        signals: signals.slice(0, 10), // Return top 10 for response
        timestamp: currentTime
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Live scanner error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
