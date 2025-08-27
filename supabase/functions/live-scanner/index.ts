import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Canonical AItradeX1 Configuration
const CANONICAL_CONFIG = {
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
  }
};

// OHLCV Data Interface
interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Technical Indicators Interface
interface TechnicalIndicators {
  ema21: number;
  sma200: number;
  adx: number;
  diPlus: number;
  diMinus: number;
  stochK: number;
  stochD: number;
  obv: number;
  obvEma: number;
  hvp: number;
  atr: number;
  volSma21: number;
  spread: number;
  breakoutHigh: number;
}

// Signal Interface
interface Signal {
  exchange: string;
  symbol: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  score: number;
  atr: number;
  sl: number;
  tp: number;
  hvp: number;
  filters: Record<string, boolean>;
  indicators: TechnicalIndicators;
  relaxed_mode: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 AItradeX1 Live Scanner started');
    
    const body = await req.json();
    const relaxed = body.relaxed_filters === true;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get configuration
    const config = relaxed 
      ? { ...CANONICAL_CONFIG.inputs, ...CANONICAL_CONFIG.relaxedMode }
      : CANONICAL_CONFIG.inputs;

    console.log('🔧 Using config:', { relaxed, adxThreshold: config.adxThreshold });

    // Start scan record
    const { data: scanRecord } = await supabase
      .from('scans')
      .insert({
        exchange: 'bybit',
        timeframe: '1h',
        relaxed_mode: relaxed
      })
      .select()
      .single();

    // Fetch live market data and analyze
    const signals = await scanLiveMarkets(config, relaxed);
    
    // Process and store signals
    let signalsProcessed = 0;
    for (const signal of signals) {
      try {
        // Check for duplicate
        const existingSignal = await checkSignalExists(supabase, signal);
        if (existingSignal) {
          console.log(`⚠️ Signal already exists for ${signal.symbol} ${signal.direction}`);
          continue;
        }

        // Insert signal
        const { data: insertedSignal, error } = await supabase
          .from('signals')
          .insert({
            exchange: signal.exchange,
            symbol: signal.symbol,
            timeframe: signal.timeframe,
            direction: signal.direction,
            bar_time: new Date().toISOString(),
            price: signal.price,
            score: signal.score,
            atr: signal.atr,
            sl: signal.sl,
            tp: signal.tp,
            hvp: signal.hvp,
            filters: signal.filters,
            indicators: signal.indicators,
            relaxed_mode: signal.relaxed_mode
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Signal insert error:', error);
          continue;
        }

        signalsProcessed++;

        // Update signals state for deduplication
        await supabase
          .from('signals_state')
          .upsert({
            exchange: signal.exchange,
            symbol: signal.symbol,
            timeframe: signal.timeframe,
            direction: signal.direction,
            last_emitted: new Date().toISOString(),
            last_price: signal.price,
            last_score: signal.score
          });

        // Send to Telegram if high confidence
        if (signal.score >= 75) {
          console.log(`📢 Sending high-confidence signal: ${signal.symbol} ${signal.direction} (Score: ${signal.score})`);
          
          try {
            await supabase.functions.invoke('telegram-bot', {
              body: { 
                signal: formatTelegramSignal(signal)
              }
            });

            // Log successful delivery
            await supabase.from('alerts_log').insert({
              signal_id: insertedSignal.id,
              channel: 'telegram',
              payload: { signal: formatTelegramSignal(signal) },
              status: 'sent'
            });
          } catch (telegramError) {
            console.error('❌ Telegram send error:', telegramError);
            await supabase.from('alerts_log').insert({
              signal_id: insertedSignal.id,
              channel: 'telegram',
              payload: { signal: formatTelegramSignal(signal) },
              status: 'failed',
              response: { error: telegramError.message }
            });
          }
        }

      } catch (signalError) {
        console.error('❌ Signal processing error:', signalError);
        await supabase.from('errors_log').insert({
          where_at: 'signal_processing',
          symbol: signal.symbol,
          details: { error: signalError.message, signal }
        });
      }
    }

    // Update scan record
    await supabase
      .from('scans')
      .update({
        finished_at: new Date().toISOString(),
        symbols_count: signals.length,
        signals_count: signalsProcessed
      })
      .eq('id', scanRecord?.id);

    return new Response(JSON.stringify({
      success: true,
      algorithm: "AItradeX1",
      scan_id: scanRecord?.id,
      signals_found: signals.length,
      signals_processed: signalsProcessed,
      relaxed_mode: relaxed,
      timestamp: new Date().toISOString()
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Live Scanner Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});

async function scanLiveMarkets(config: any, relaxed: boolean): Promise<Signal[]> {
  const signals: Signal[] = [];
  
  // Top crypto symbols for scanning
  const symbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
    'XRPUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT',
    'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'FILUSDT'
  ];

  for (const symbol of symbols) {
    try {
      console.log(`📊 Analyzing ${symbol}...`);
      
      // Fetch real market data from Bybit
      const ohlcvData = await fetchBybitData(symbol, '1h');
      
      if (ohlcvData.length < 250) {
        console.log(`⚠️ Insufficient data for ${symbol}: ${ohlcvData.length} bars`);
        continue;
      }

      // Compute technical indicators
      const indicators = computeIndicators(ohlcvData, config);
      
      // Evaluate AItradeX1 strategy
      const evaluation = evaluateAItradeX1(indicators, config, ohlcvData);
      
      if (evaluation.signal !== 'NONE') {
        const currentPrice = ohlcvData[ohlcvData.length - 1].close;
        
        signals.push({
          exchange: 'bybit',
          symbol,
          timeframe: '1h',
          direction: evaluation.signal,
          price: currentPrice,
          score: evaluation.score,
          atr: indicators.atr,
          sl: evaluation.signal === 'LONG' 
            ? currentPrice - (1.5 * indicators.atr)
            : currentPrice + (1.5 * indicators.atr),
          tp: evaluation.signal === 'LONG'
            ? currentPrice + (getTpMultiplier(indicators.hvp) * indicators.atr)
            : currentPrice - (getTpMultiplier(indicators.hvp) * indicators.atr),
          hvp: indicators.hvp,
          filters: evaluation.filters,
          indicators,
          relaxed_mode: relaxed
        });
        
        console.log(`✅ Signal found: ${symbol} ${evaluation.signal} (Score: ${evaluation.score})`);
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${symbol}:`, error);
    }
  }

  return signals;
}

async function fetchBybitData(symbol: string, timeframe: string): Promise<OHLCVData[]> {
  const interval = timeframe === '1h' ? 60 : timeframe === '5m' ? 5 : 1;
  const limit = 500; // Fetch enough data for indicators
  
  const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    return data.result.list.map((item: any) => ({
      timestamp: parseInt(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    })).reverse(); // Bybit returns newest first, we need oldest first
    
  } catch (error) {
    console.error(`Failed to fetch data for ${symbol}:`, error);
    throw error;
  }
}

function computeIndicators(data: OHLCVData[], config: any): TechnicalIndicators {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);
  
  // EMA 21
  const ema21 = calculateEMA(closes, config.emaLen);
  
  // SMA 200
  const sma200 = calculateSMA(closes, config.smaLen);
  
  // ADX and DMI
  const { adx, diPlus, diMinus } = calculateADX(highs, lows, closes, 14);
  
  // Stochastic
  const { k: stochK, d: stochD } = calculateStochastic(
    highs, lows, closes, 
    config.stochLength, config.stochSmoothK, config.stochSmoothD
  );
  
  // OBV and OBV EMA
  const obvValues = calculateOBV(closes, volumes);
  const obvEma = calculateEMA(obvValues, config.obvEmaLen);
  
  // HVP (Historical Volatility Percentile)
  const hvp = calculateHVP(closes, 21, 252);
  
  // ATR
  const atr = calculateATR(highs, lows, closes, config.atrLen);
  
  // Volume SMA
  const volSma21 = calculateSMA(volumes, 21);
  
  // Spread
  const spread = Math.abs(data[data.length - 1].close - data[data.length - 1].open) / data[data.length - 1].open * 100;
  
  // Breakout high
  const recentHighs = highs.slice(-config.breakoutLen - 1, -1); // Exclude current bar
  const breakoutHigh = Math.max(...recentHighs);
  
  return {
    ema21: ema21[ema21.length - 1],
    sma200: sma200[sma200.length - 1],
    adx: adx[adx.length - 1],
    diPlus: diPlus[diPlus.length - 1],
    diMinus: diMinus[diMinus.length - 1],
    stochK: stochK[stochK.length - 1],
    stochD: stochD[stochD.length - 1],
    obv: obvValues[obvValues.length - 1],
    obvEma: obvEma[obvEma.length - 1],
    hvp,
    atr: atr[atr.length - 1],
    volSma21: volSma21[volSma21.length - 1],
    spread,
    breakoutHigh
  };
}

function evaluateAItradeX1(indicators: TechnicalIndicators, config: any, data: OHLCVData[]) {
  const current = data[data.length - 1];
  const prev1 = data[data.length - 2];
  const prev4 = data[data.length - 5];
  
  // Long conditions
  const trendFilter = indicators.ema21 > indicators.sma200;
  const trendSlope = indicators.ema21 > calculateEMA(data.slice(-5).map(d => d.close), config.emaLen)[0];
  const adxFilter = indicators.adx >= config.adxThreshold;
  const dmiFilter = indicators.diPlus > indicators.diMinus;
  const dmiSlope = indicators.diPlus > calculateDMI(
    data.slice(-5).map(d => d.high),
    data.slice(-5).map(d => d.low),
    data.slice(-5).map(d => d.close)
  ).diPlus[0];
  const stochFilter = indicators.stochK > indicators.stochD && indicators.stochK < 35 && indicators.stochD < 40;
  const volumeFilter = current.volume > config.volSpikeMult * indicators.volSma21;
  const obvFilter = indicators.obv > indicators.obvEma;
  const obvSlope = indicators.obv > calculateOBV(
    data.slice(-5).map(d => d.close),
    data.slice(-5).map(d => d.volume)
  )[0];
  const hvpFilter = indicators.hvp >= config.hvpLower && indicators.hvp <= config.hvpUpper;
  const spreadFilter = indicators.spread < config.spreadMaxPct;
  const breakoutFilter = current.close > indicators.breakoutHigh;
  
  const longFilters = {
    trend: trendFilter && trendSlope,
    adx: adxFilter,
    dmi: dmiFilter && dmiSlope,
    stoch: stochFilter,
    volume: volumeFilter,
    obv: obvFilter && obvSlope,
    hvp: hvpFilter,
    spread: spreadFilter,
    breakout: breakoutFilter
  };
  
  const longSignal = Object.values(longFilters).every(Boolean);
  
  // Short conditions (mirror of long)
  const shortTrendFilter = indicators.ema21 < indicators.sma200;
  const shortTrendSlope = indicators.ema21 < calculateEMA(data.slice(-5).map(d => d.close), config.emaLen)[0];
  const shortDmiFilter = indicators.diMinus > indicators.diPlus;
  const shortDmiSlope = indicators.diMinus > calculateDMI(
    data.slice(-5).map(d => d.high),
    data.slice(-5).map(d => d.low),
    data.slice(-5).map(d => d.close)
  ).diMinus[0];
  const shortStochFilter = indicators.stochK < indicators.stochD && indicators.stochK > 65 && indicators.stochD > 60;
  const shortObvFilter = indicators.obv < indicators.obvEma;
  const shortObvSlope = indicators.obv < calculateOBV(
    data.slice(-5).map(d => d.close),
    data.slice(-5).map(d => d.volume)
  )[0];
  const shortBreakoutFilter = current.close < Math.min(...data.slice(-config.breakoutLen - 1, -1).map(d => d.low));
  
  const shortFilters = {
    trend: shortTrendFilter && shortTrendSlope,
    adx: adxFilter,
    dmi: shortDmiFilter && shortDmiSlope,
    stoch: shortStochFilter,
    volume: volumeFilter,
    obv: shortObvFilter && shortObvSlope,
    hvp: hvpFilter,
    spread: spreadFilter,
    breakout: shortBreakoutFilter
  };
  
  const shortSignal = Object.values(shortFilters).every(Boolean);
  
  // Calculate score (exclude daily filter from score)
  const scoreFilters = longSignal ? longFilters : shortFilters;
  const scoreCount = Object.entries(scoreFilters)
    .filter(([key]) => key !== 'daily')
    .reduce((acc, [_, value]) => acc + (value ? 1 : 0), 0);
  
  const score = (scoreCount / 8) * 100; // 8 buckets total
  
  if (longSignal) {
    return { signal: 'LONG' as const, score, filters: longFilters };
  } else if (shortSignal) {
    return { signal: 'SHORT' as const, score, filters: shortFilters };
  } else {
    return { signal: 'NONE' as const, score: 0, filters: {} };
  }
}

// Technical Indicator Calculation Functions
function calculateEMA(data: number[], period: number): number[] {
  const ema = [];
  const multiplier = 2 / (period + 1);
  ema[0] = data[0];
  
  for (let i = 1; i < data.length; i++) {
    ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

function calculateSMA(data: number[], period: number): number[] {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const trueRanges = [];
  
  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return calculateEMA(trueRanges, period);
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14) {
  const dmPlus = [];
  const dmMinus = [];
  const trueRanges = [];
  
  for (let i = 1; i < highs.length; i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    
    dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  const smoothedDmPlus = calculateEMA(dmPlus, period);
  const smoothedDmMinus = calculateEMA(dmMinus, period);
  const smoothedTr = calculateEMA(trueRanges, period);
  
  const diPlus = smoothedDmPlus.map((dm, i) => (dm / smoothedTr[i]) * 100);
  const diMinus = smoothedDmMinus.map((dm, i) => (dm / smoothedTr[i]) * 100);
  
  const dx = diPlus.map((plus, i) => {
    const sum = plus + diMinus[i];
    return sum === 0 ? 0 : (Math.abs(plus - diMinus[i]) / sum) * 100;
  });
  
  const adx = calculateEMA(dx, period);
  
  return { adx, diPlus, diMinus };
}

function calculateDMI(highs: number[], lows: number[], closes: number[]) {
  const dmPlus = [];
  const dmMinus = [];
  
  for (let i = 1; i < highs.length; i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    
    dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }
  
  return { diPlus: dmPlus, diMinus: dmMinus };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, kSmooth: number, dSmooth: number) {
  const kValues = [];
  
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }
  
  const kSmoothed = calculateSMA(kValues, kSmooth);
  const dSmoothed = calculateSMA(kSmoothed, dSmooth);
  
  return { k: kSmoothed, d: dSmoothed };
}

function calculateOBV(closes: number[], volumes: number[]): number[] {
  const obv = [volumes[0]];
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv.push(obv[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      obv.push(obv[i - 1] - volumes[i]);
    } else {
      obv.push(obv[i - 1]);
    }
  }
  
  return obv;
}

function calculateHVP(closes: number[], shortPeriod: number, longPeriod: number): number {
  if (closes.length < longPeriod) return 50;
  
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  
  // Calculate current volatility (21-day)
  const recentReturns = returns.slice(-shortPeriod);
  const avgReturn = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / recentReturns.length;
  const currentVol = Math.sqrt(variance * 252); // Annualized
  
  // Calculate historical volatilities (252-day rolling)
  const historicalVols = [];
  for (let i = longPeriod; i <= returns.length; i++) {
    const periodReturns = returns.slice(i - longPeriod, i);
    const periodAvg = periodReturns.reduce((a, b) => a + b, 0) / periodReturns.length;
    const periodVariance = periodReturns.reduce((sum, ret) => sum + Math.pow(ret - periodAvg, 2), 0) / periodReturns.length;
    const periodVol = Math.sqrt(periodVariance * 252);
    historicalVols.push(periodVol);
  }
  
  // Calculate percentile rank
  const lowerCount = historicalVols.filter(vol => vol < currentVol).length;
  return (lowerCount / historicalVols.length) * 100;
}

function getTpMultiplier(hvp: number): number {
  if (hvp > 75) return 3.5;
  if (hvp > 65) return 3.0;
  return 2.5;
}

async function checkSignalExists(supabase: any, signal: Signal): Promise<boolean> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('signals_state')
    .select('last_emitted')
    .eq('exchange', signal.exchange)
    .eq('symbol', signal.symbol)
    .eq('timeframe', signal.timeframe)
    .eq('direction', signal.direction)
    .single();
  
  return data && new Date(data.last_emitted) > new Date(thirtyMinutesAgo);
}

function formatTelegramSignal(signal: Signal) {
  return {
    signal_id: `${signal.exchange}_${signal.symbol}_${Date.now()}`,
    token: signal.symbol.replace('USDT', ''),
    direction: signal.direction,
    entry_price: signal.price,
    confidence_score: signal.score,
    atr: signal.atr,
    sl: signal.sl,
    tp: signal.tp,
    hvp: signal.hvp,
    indicators: {
      adx: signal.indicators.adx,
      stoch_k: signal.indicators.stochK,
      volume_spike: signal.filters.volume
    },
    is_premium: signal.score >= 85
  };
}