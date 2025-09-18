import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import CCXT for Deno
import ccxt from 'https://esm.sh/ccxt@4.5.5';

interface AITRADEX1Signal {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  timeframe: string;
  score: number;
  confidence: number;
  algo: string;
  exchange: string;
  grade: string;
  indicators: Record<string, any>;
  metadata: Record<string, any>;
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

    const { action = 'start' } = await req.json().catch(() => ({}));
    
    console.log(`🚀 [CCXT Feed] Action: ${action}`);

    if (action === 'start' || action === 'scan') {
      await performDataCollection(supabase);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'CCXT data collection completed',
        timestamp: new Date().toISOString()
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'status') {
      const status = await getSystemStatus(supabase);
      return new Response(JSON.stringify(status), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [CCXT Feed] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'CCXT feed processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performDataCollection(supabase: any) {
  console.log('📊 [CCXT] Starting data collection...');

  const symbols = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOT/USDT',
    'LINK/USDT', 'AVAX/USDT', 'MATIC/USDT', 'ATOM/USDT', 'NEAR/USDT',
    'FTM/USDT', 'ALGO/USDT', 'XRP/USDT', 'LTC/USDT', 'BCH/USDT'
  ];

  // Initialize exchanges
  const exchanges = [
    { instance: new ccxt.binance({ sandbox: false, enableRateLimit: true }), name: 'binance' },
    { instance: new ccxt.bybit({ sandbox: false, enableRateLimit: true }), name: 'bybit' },
    { instance: new ccxt.okx({ sandbox: false, enableRateLimit: true }), name: 'okx' }
  ];

  let totalSignals = 0;
  let totalMarketData = 0;

  for (const { instance: exchange, name: exchangeName } of exchanges) {
    try {
      console.log(`📡 [${exchangeName}] Fetching data...`);

      // Fetch tickers
      const tickers = await exchange.fetchTickers(symbols);
      
      // Process market data
      const marketDataPoints = await processMarketData(tickers, exchangeName, supabase);
      totalMarketData += marketDataPoints;

      // Fetch OHLCV and generate signals
      const timeframes = ['5m', '15m', '1h', '4h'];
      
      for (const timeframe of timeframes) {
        for (const symbol of symbols) {
          try {
            const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, 300);
            if (ohlcv && ohlcv.length >= 250) {
              const signals = applyAITRADEX1Logic(symbol, ohlcv, timeframe, exchangeName);
              
              if (signals.length > 0) {
                await storeSignals(signals, supabase);
                totalSignals += signals.length;
                console.log(`🎯 [${exchangeName}] Generated ${signals.length} signals for ${symbol} ${timeframe}`);
              }
            }
          } catch (symbolError) {
            console.warn(`⚠️ [${exchangeName}] Failed to process ${symbol} ${timeframe}:`, symbolError.message);
          }
        }
      }

    } catch (exchangeError) {
      console.error(`❌ [${exchangeName}] Exchange error:`, exchangeError.message);
    }
  }

  console.log(`✅ [CCXT] Collection complete: ${totalMarketData} market data points, ${totalSignals} signals`);
}

async function processMarketData(tickers: any, exchangeName: string, supabase: any): Promise<number> {
  const marketDataPoints = [];

  for (const [symbol, ticker] of Object.entries(tickers)) {
    const cleanSymbol = symbol.replace('/', '');
    
    marketDataPoints.push({
      symbol: cleanSymbol,
      exchange: exchangeName,
      price: ticker.last || 0,
      bid: ticker.bid || 0,
      ask: ticker.ask || 0,
      volume: ticker.baseVolume || 0,
      high_24h: ticker.high || 0,
      low_24h: ticker.low || 0,
      change_24h: ticker.change || 0,
      change_24h_percent: ticker.percentage || 0,
      base_asset: cleanSymbol.replace('USDT', ''),
      quote_asset: 'USDT',
      raw_data: ticker,
      updated_at: new Date().toISOString()
    });
  }

  if (marketDataPoints.length > 0) {
    const { error } = await supabase
      .from('live_market_data')
      .upsert(marketDataPoints, {
        onConflict: 'symbol,exchange',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('❌ Failed to store market data:', error);
      return 0;
    }
  }

  return marketDataPoints.length;
}

function applyAITRADEX1Logic(symbol: string, ohlcv: number[][], timeframe: string, exchange: string): AITRADEX1Signal[] {
  try {
    if (ohlcv.length < 250) return [];

    // Extract OHLCV data
    const closes = ohlcv.map(candle => candle[4]);
    const highs = ohlcv.map(candle => candle[2]);
    const lows = ohlcv.map(candle => candle[3]);
    const volumes = ohlcv.map(candle => candle[5]);

    // Calculate technical indicators
    const ema21 = calculateEMA(closes, 21);
    const sma200 = calculateSMA(closes, 200);
    const rsi14 = calculateRSI(closes, 14);
    const atr14 = calculateATR(highs, lows, closes, 14);
    const { adx, plusDI, minusDI } = calculateADX(highs, lows, closes, 14);
    const volumeAvg20 = calculateSMA(volumes, 20);
    const hvp = calculateHVP(closes, 252);

    const current = closes.length - 1;
    const previous = current - 1;

    // Current values
    const currentPrice = closes[current];
    const currentEMA21 = ema21[current];
    const currentSMA200 = sma200[current];
    const currentRSI = rsi14[current];
    const currentATR = atr14[current];
    const currentADX = adx[current];
    const currentPlusDI = plusDI[current];
    const currentMinusDI = minusDI[current];
    const currentVolume = volumes[current];
    const currentVolumeAvg = volumeAvg20[current];
    const currentHVP = hvp[current];

    // Previous values
    const prevEMA21 = ema21[previous];
    const prevSMA200 = sma200[previous];

    // Primary conditions
    const volumeRatio = currentVolume / currentVolumeAvg;
    const volumeSpike = volumeRatio > 1.5;
    const hvpCondition = currentHVP > 50 || currentHVP > calculateSMA(hvp, 20)[current];

    const signals: AITRADEX1Signal[] = [];

    // Bullish Signal (Golden Cross)
    const bullishCrossover = currentEMA21 > currentSMA200 && prevEMA21 <= prevSMA200;
    if (bullishCrossover && volumeSpike && hvpCondition) {
      
      // Optional filters
      const stochBullish = true; // Simplified for now
      const dmiBullish = currentPlusDI > currentMinusDI && currentADX > 20;

      if (stochBullish && dmiBullish) {
        const signal = createSignal({
          symbol,
          direction: 'LONG',
          price: currentPrice,
          atr: currentATR,
          timeframe,
          exchange,
          volumeRatio,
          hvp: currentHVP,
          indicators: {
            ema21: currentEMA21,
            sma200: currentSMA200,
            rsi_14: currentRSI,
            adx: currentADX,
            plus_di: currentPlusDI,
            minus_di: currentMinusDI,
            volume_ratio: volumeRatio,
            atr_14: currentATR,
            hvp: currentHVP
          }
        });

        signals.push(signal);
      }
    }

    // Bearish Signal (Death Cross)
    const bearishCrossover = currentEMA21 < currentSMA200 && prevEMA21 >= prevSMA200;
    if (bearishCrossover && volumeSpike && hvpCondition) {
      
      // Optional filters
      const stochBearish = true; // Simplified for now
      const dmiBearish = currentMinusDI > currentPlusDI && currentADX > 20;

      if (stochBearish && dmiBearish) {
        const signal = createSignal({
          symbol,
          direction: 'SHORT',
          price: currentPrice,
          atr: currentATR,
          timeframe,
          exchange,
          volumeRatio,
          hvp: currentHVP,
          indicators: {
            ema21: currentEMA21,
            sma200: currentSMA200,
            rsi_14: currentRSI,
            adx: currentADX,
            plus_di: currentPlusDI,
            minus_di: currentMinusDI,
            volume_ratio: volumeRatio,
            atr_14: currentATR,
            hvp: currentHVP
          }
        });

        signals.push(signal);
      }
    }

    return signals;

  } catch (error) {
    console.error(`❌ [AITRADEX1] Error for ${symbol}:`, error);
    return [];
  }
}

function createSignal(params: any): AITRADEX1Signal {
  const { symbol, direction, price, atr, timeframe, exchange, volumeRatio, hvp, indicators } = params;

  // ATR-based risk management
  const atrMultiplier = timeframe === '5m' ? 1.5 : timeframe === '15m' ? 2 : 2.5;
  const stopLoss = direction === 'LONG' 
    ? price - (atr * atrMultiplier)
    : price + (atr * atrMultiplier);

  const riskReward = 2; // 1:2 risk/reward ratio
  const riskAmount = Math.abs(price - stopLoss);
  const takeProfit = direction === 'LONG'
    ? price + (riskAmount * riskReward)
    : price - (riskAmount * riskReward);

  // Confidence scoring
  let confidence = 70; // Base confidence

  // Volume bonus (up to +15)
  confidence += Math.min(15, (volumeRatio - 1.5) * 10);

  // Volatility bonus (up to +10)
  confidence += Math.min(10, (hvp - 50) / 5);

  // Stochastic bonus (+3)
  confidence += 3;

  // DMI bonus (+2)
  confidence += 2;

  // Cap confidence
  confidence = Math.min(95, Math.max(70, Math.round(confidence)));

  // Grade calculation
  let grade = 'C';
  if (confidence >= 90) grade = 'A+';
  else if (confidence >= 85) grade = 'A';
  else if (confidence >= 80) grade = 'B';

  return {
    symbol: symbol.replace('/', ''),
    direction,
    entry_price: price,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    timeframe,
    score: confidence,
    confidence,
    algo: 'AITRADEX1',
    exchange,
    grade,
    indicators,
    metadata: {
      risk_reward: riskReward,
      atr_multiplier: atrMultiplier,
      volume_ratio: volumeRatio,
      hvp: hvp,
      generated_at: new Date().toISOString(),
      algorithm_version: '2.0'
    }
  };
}

async function storeSignals(signals: AITRADEX1Signal[], supabase: any) {
  const signalsToStore = signals.map(signal => ({
    symbol: signal.symbol,
    direction: signal.direction,
    price: signal.entry_price,
    sl: signal.stop_loss,
    tp: signal.take_profit,
    timeframe: signal.timeframe,
    score: signal.score,
    confidence: signal.confidence,
    algo: signal.algo,
    exchange: signal.exchange,
    metadata: {
      ...signal.metadata,
      indicators: signal.indicators,
      grade: signal.grade
    },
    created_at: new Date().toISOString(),
    bar_time: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('signals')
    .insert(signalsToStore);

  if (error) {
    console.error('❌ Failed to store signals:', error);
    throw error;
  }
}

async function getSystemStatus(supabase: any) {
  try {
    // Get recent market data count
    const { data: marketData, count: marketCount } = await supabase
      .from('live_market_data')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    // Get recent signals count
    const { data: signalData, count: signalCount } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .eq('algo', 'AITRADEX1')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    return {
      success: true,
      status: 'active',
      market_data_points: marketCount || 0,
      signals_generated: signalCount || 0,
      last_update: new Date().toISOString(),
      exchanges: ['binance', 'bybit', 'okx'],
      timeframes: ['5m', '15m', '1h', '4h']
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 'error'
    };
  }
}

// Technical indicator calculation functions
function calculateEMA(data: number[], period: number): number[] {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * multiplier + ema[i - 1] * (1 - multiplier);
  }
  
  return ema;
}

function calculateSMA(data: number[], period: number): number[] {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateRSI(data: number[], period: number): number[] {
  const rsi = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const trs = [];
  
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }

  const atr = [];
  for (let i = period - 1; i < trs.length; i++) {
    const avgTR = trs.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
    atr.push(avgTR);
  }

  return atr;
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number) {
  const plusDMs = [];
  const minusDMs = [];
  const trs = [];

  for (let i = 1; i < highs.length; i++) {
    const plusDM = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] ? Math.max(highs[i] - highs[i - 1], 0) : 0;
    const minusDM = lows[i - 1] - lows[i] > highs[i] - highs[i - 1] ? Math.max(lows[i - 1] - lows[i], 0) : 0;
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
    trs.push(tr);
  }

  const plusDI = [];
  const minusDI = [];
  const adx = [];

  for (let i = period - 1; i < plusDMs.length; i++) {
    const smoothedPlusDM = plusDMs.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
    const smoothedMinusDM = minusDMs.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
    const smoothedTR = trs.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;

    const plusDIValue = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const minusDIValue = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
    
    plusDI.push(plusDIValue);
    minusDI.push(minusDIValue);

    const dx = Math.abs(plusDIValue - minusDIValue) / (plusDIValue + minusDIValue) * 100;
    adx.push(dx);
  }

  // Smooth ADX
  const smoothedADX = calculateEMA(adx, period);

  return { adx: smoothedADX, plusDI, minusDI };
}

function calculateHVP(closes: number[], period: number): number[] {
  const hvp = [];
  const returns = [];
  
  // Calculate returns
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }

  // Calculate rolling HVP
  for (let i = period; i < returns.length; i++) {
    const slice = returns.slice(i - period, i);
    const variance = slice.reduce((sum, ret, idx, arr) => {
      const mean = arr.reduce((s, r) => s + r, 0) / arr.length;
      return sum + Math.pow(ret - mean, 2);
    }, 0) / (slice.length - 1);
    
    const volatility = Math.sqrt(variance * 252); // Annualized
    
    // Calculate percentile (simplified)
    const historicalVols = [];
    for (let j = period; j <= i; j++) {
      const histSlice = returns.slice(j - period, j);
      const histVar = histSlice.reduce((sum, ret, idx, arr) => {
        const mean = arr.reduce((s, r) => s + r, 0) / arr.length;
        return sum + Math.pow(ret - mean, 2);
      }, 0) / (histSlice.length - 1);
      historicalVols.push(Math.sqrt(histVar * 252));
    }
    
    const belowCurrent = historicalVols.filter(vol => vol < volatility).length;
    const percentile = (belowCurrent / historicalVols.length) * 100;
    
    hvp.push(percentile);
  }

  return hvp;
}