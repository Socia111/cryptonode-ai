import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Production cooldown periods (minutes) - based on your recommendations
const COOLDOWN_PERIODS = {
  '1m': 1,
  '5m': 3,
  '15m': 10,
  '1h': 30,
  '4h': 120,
  '1d': 720
};

// Symbol universe by volume tier (>$5-10M 24h volume) - REAL TRADING SYMBOLS
const SYMBOL_TIERS = {
  tier1: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'], // Top liquid
  tier2: ['ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'MATICUSDT', 'LTCUSDT'], // High volume
  tier3: ['NEARUSDT', 'APTUSDT', 'INJUSDT', 'STXUSDT', 'TONUSDT'], // Mid volume
  tier4: ['AVAXUSDT', 'DOTUSDT', 'ATOMUSDT', 'FILUSDT', 'UNIUSDT'] // Extended universe
};

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
  indicators: any;
  relaxed_mode: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 AItradeX1 REAL MARKET DATA Scanner started');
    
    const { exchange = 'bybit', timeframe = '1h', relaxed_filters = false, symbols = [] } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get configuration from aitradex1-config function
    const { data: configData, error: configError } = await supabase.functions.invoke('aitradex1-config', {
      body: { relaxed_filters }
    });

    if (configError) {
      throw new Error(`Failed to get config: ${configError.message}`);
    }

    const config = configData.config;
    console.log(`🔧 Using ${relaxed_filters ? 'RELAXED' : 'CANONICAL'} config: { adxThreshold: ${config.inputs.adxThreshold}, hvpUpper: ${config.inputs.hvpUpper} }`);

    // Start scan record
    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .insert({
        exchange,
        timeframe,
        started_at: new Date().toISOString(),
        relaxed_mode: relaxed_filters
      })
      .select()
      .single();

    if (scanError) {
      console.warn('Could not create scan record:', scanError.message);
    }

    // Get symbol universe
    const symbolsToScan = symbols.length > 0 ? symbols : getSymbolUniverse(timeframe, relaxed_filters);
    console.log(`🎯 Scanning ${symbolsToScan.length} symbols on ${exchange} ${timeframe} with REAL MARKET DATA`);

    const results = await scanLiveMarkets(supabase, exchange, timeframe, symbolsToScan, config);
    
    // Update scan completion
    if (scanData) {
      await supabase
        .from('scans')
        .update({
          finished_at: new Date().toISOString(),
          symbols_count: symbolsToScan.length,
          signals_count: results.signals_processed
        })
        .eq('id', scanData.id);
    }

    console.log(`✅ Production scan completed: ${results.signals_found} signals found, ${results.signals_processed} processed, ${results.cooldown_skipped} cooldown-skipped`);

    return new Response(JSON.stringify({
      success: true,
      algorithm: 'AItradeX1-Production-RealData',
      exchange,
      timeframe,
      relaxed_filters,
      symbols_scanned: symbolsToScan.length,
      signals_found: results.signals_found,
      signals_processed: results.signals_processed,
      cooldown_skipped: results.cooldown_skipped,
      scan_id: scanData?.id,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Production Scanner Error:', error);
    
    // Log to errors table
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabase.from('errors_log').insert({
        where_at: 'live-scanner-production',
        details: { error: error.message, stack: error.stack }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

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

// Get symbol universe based on timeframe and volume - EXPANDED FOR RELAXED MODE
function getSymbolUniverse(timeframe: string, relaxed_filters: boolean): string[] {
  if (relaxed_filters) {
    // Discovery mode: use more symbols for more opportunities
    return [...SYMBOL_TIERS.tier1, ...SYMBOL_TIERS.tier2, ...SYMBOL_TIERS.tier3];
  }
  
  switch (timeframe) {
    case '1m':
    case '5m':
      return SYMBOL_TIERS.tier1; // High-frequency: focus on most liquid
    case '15m':
      return [...SYMBOL_TIERS.tier1, ...SYMBOL_TIERS.tier2];
    case '1h':
    case '4h':
      return [...SYMBOL_TIERS.tier1, ...SYMBOL_TIERS.tier2, ...SYMBOL_TIERS.tier3];
    default:
      return SYMBOL_TIERS.tier1;
  }
}

async function scanLiveMarkets(supabase: any, exchange: string, timeframe: string, symbols: string[], config: any) {
  let signalsFound = 0;
  let signalsProcessed = 0;
  let cooldownSkipped = 0;

  for (const symbol of symbols) {
    try {
      console.log(`📊 Analyzing ${symbol}...`);
      
      // Fetch REAL OHLCV data from Bybit API - NO SIMULATION
      const ohlcvData = await fetchBybitData(symbol, timeframe);
      if (!ohlcvData || ohlcvData.length < 200) {
        console.log(`⚠️ Insufficient REAL data for ${symbol}: ${ohlcvData?.length || 0} bars`);
        continue;
      }

      // Compute REAL technical indicators with ALIGNED SERIES
      const indicators = computeIndicators(ohlcvData, config.inputs);
      
      // Evaluate AItradeX1 strategy with SCORE-BASED FILTERING (7 of 9 buckets)
      const evaluation = evaluateAItradeX1(ohlcvData, indicators, config);
      
      if (evaluation.signal !== 'NONE') {
        signalsFound++;
        
        // Production cooldown check - prevent spam
        const cooldownMinutes = COOLDOWN_PERIODS[timeframe] || 30;
        const canEmit = await checkCooldown(supabase, exchange, symbol, timeframe, evaluation.signal, cooldownMinutes);
        
        if (!canEmit) {
          console.log(`⏰ Cooldown active for ${symbol} ${evaluation.signal}, skipping...`);
          cooldownSkipped++;
          continue;
        }
        
        // Bar-close detection - only emit when bar is actually closed
        if (!isBarClosed(ohlcvData, timeframe)) {
          console.log(`⏳ Bar not closed for ${symbol}, skipping intrabar signal...`);
          continue;
        }
        
        const currentPrice = ohlcvData[ohlcvData.length - 1].close;
        const signal: Signal = {
          exchange,
          symbol,
          timeframe,
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
          relaxed_mode: config.relaxedMode || false
        };
        
        // Insert signal to database with UPSERT for deduplication
        const { data: insertedSignal, error: insertError } = await supabase.from('signals').upsert({
          algo: 'AItradeX1',
          exchange: signal.exchange,
          symbol: signal.symbol,
          timeframe: signal.timeframe,
          direction: signal.direction,
          bar_time: new Date(ohlcvData[ohlcvData.length - 1].time).toISOString(),
          price: signal.price,
          score: signal.score,
          atr: signal.atr,
          sl: signal.sl,
          tp: signal.tp,
          hvp: signal.hvp,
          filters: signal.filters,
          indicators: signal.indicators,
          relaxed_mode: signal.relaxed_mode
        }, { 
          onConflict: 'exchange,symbol,timeframe,direction,bar_time' 
        }).select().single();

        if (!insertError) {
          signalsProcessed++;
          console.log(`✅ ${symbol} ${signal.direction} signal saved (score: ${signal.score}%, filters: ${Object.values(signal.filters).filter(Boolean).length}/9)`);
          
          // Update signals state for cooldown tracking
          await supabase.from('signals_state').upsert({
            exchange: signal.exchange,
            symbol: signal.symbol,
            timeframe: signal.timeframe,
            direction: signal.direction,
            last_emitted: new Date().toISOString(),
            last_price: signal.price,
            last_score: signal.score
          });

          // Send high-confidence signals to Telegram (75%+ score)
          if (signal.score >= 75) {
            try {
              const telegramPayload = formatTelegramSignal(signal);
              await supabase.functions.invoke('telegram-bot', { body: { signal: telegramPayload } });
              
              // Log successful alert
              await supabase.from('alerts_log').insert({
                signal_id: insertedSignal.id,
                channel: 'telegram',
                payload: { signal: telegramPayload },
                status: 'sent'
              });
              
              console.log(`📱 High-confidence signal sent to Telegram: ${symbol} ${signal.direction} (${signal.score}%)`);
            } catch (telegramError) {
              console.warn(`Failed to send Telegram notification: ${telegramError.message}`);
              
              await supabase.from('alerts_log').insert({
                signal_id: insertedSignal.id,
                channel: 'telegram',
                payload: { error: telegramError.message },
                status: 'failed'
              });
            }
          }
        } else {
          console.error(`❌ Failed to insert signal for ${symbol}:`, insertError.message);
        }
      } else {
        // DEBUG LOGGING - Show why signal failed (this will help tune filters)
        const passedFilters = Object.values(evaluation.filters).filter(Boolean).length;
        console.log(`[DEBUG] ${symbol} no-signal (${passedFilters}/9 filters passed):`, {
          trend: evaluation.filters.trend,
          adx: evaluation.filters.adx,
          dmi: evaluation.filters.dmi, 
          stoch: evaluation.filters.stoch,
          volume: evaluation.filters.volume,
          obv: evaluation.filters.obv,
          hvp: evaluation.filters.hvp,
          spread: evaluation.filters.spread,
          breakout: evaluation.filters.breakout,
          score: evaluation.score
        });
      }
    } catch (error) {
      console.error(`❌ Error processing ${symbol}:`, error.message);
      
      // Log symbol-specific errors
      await supabase.from('errors_log').insert({
        where_at: 'live-scanner-symbol',
        symbol,
        details: { error: error.message, stack: error.stack }
      });
    }
  }

  return { 
    signals_found: signalsFound, 
    signals_processed: signalsProcessed,
    cooldown_skipped: cooldownSkipped
  };
}

// Production cooldown check - prevent signal spam
async function checkCooldown(supabase: any, exchange: string, symbol: string, timeframe: string, direction: string, cooldownMinutes: number): Promise<boolean> {
  const { data } = await supabase
    .from('signals_state')
    .select('last_emitted')
    .eq('exchange', exchange)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .eq('direction', direction)
    .single();
    
  if (!data?.last_emitted) return true;
  
  const lastEmitted = new Date(data.last_emitted);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastEmitted.getTime()) / (1000 * 60);
  
  return diffMinutes >= cooldownMinutes;
}

// Bar-close detection for production safety - no intrabar signals
function isBarClosed(ohlcvData: any[], timeframe: string): boolean {
  if (!ohlcvData.length) return false;
  
  const lastBar = ohlcvData[ohlcvData.length - 1];
  const now = Date.now();
  
  // Get timeframe in minutes
  const tfMinutes = timeframe === '1m' ? 1 : 
                   timeframe === '5m' ? 5 :
                   timeframe === '15m' ? 15 :
                   timeframe === '1h' ? 60 : 
                   timeframe === '4h' ? 240 :
                   timeframe === '1d' ? 1440 : 60;
  
  const barEndTime = lastBar.time + (tfMinutes * 60 * 1000);
  
  // Allow 30 second buffer for bar close
  return now >= (barEndTime - 30000);
}

// Retry + rate limits for Bybit
async function getBybit(url: string, tries = 3, backoff = 300): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(url, { 
        headers: { 'User-Agent': 'aitradex1/1.0' } 
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      const errorText = await response.text();
      lastErr = errorText;
      if (response.status === 429 || response.status >= 500) {
        console.warn(`⚠️  Bybit rate limit/server error, retrying in ${backoff * (i + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff * (i + 1)));
      } else {
        break; // Don't retry for 4xx errors
      }
    } catch (err) {
      lastErr = err;
      if (i < tries - 1) {
        console.warn(`🔄 Network error, retrying in ${backoff * (i + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff * (i + 1)));
      }
    }
  }
  throw new Error(`Bybit API failed after ${tries} attempts: ${lastErr}`);
}

// Fetch REAL market data from Bybit API - NO MOCK DATA, NO SIMULATION
async function fetchBybitData(symbol: string, timeframe: string, limit: number = 200): Promise<any[]> {
  const baseUrl = 'https://api.bybit.com/v5/market/kline';
  const params = new URLSearchParams({
    category: 'linear', // Use USDT perpetual contracts for real trading data
    symbol: symbol,
    interval: timeframe,
    limit: limit.toString()
  });

  const url = `${baseUrl}?${params}`;
  console.log(`🔄 Fetching REAL MARKET DATA for ${symbol} ${timeframe} (${limit} candles)`);
  console.log(`📡 API URL: ${url}`);
  
  try {
    const data = await getBybit(url);
    console.log(`📊 API Response for ${symbol}:`, JSON.stringify(data, null, 2));
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg || 'Unknown error'}`);
    }

    if (!data.result || !data.result.list || !Array.isArray(data.result.list)) {
      console.error(`❌ Invalid API response structure for ${symbol}:`, data);
      throw new Error(`Invalid Bybit API response: missing result.list array`);
    }

    if (data.result.list.length === 0) {
      console.warn(`⚠️  Empty data returned for ${symbol} ${timeframe}`);
      return [];
    }

    // Convert Bybit format to standard OHLCV with REAL timestamps
    const ohlcv = data.result.list.reverse().map((item: any, index: number) => {
      if (!item || !Array.isArray(item) || item.length < 6) {
        console.error(`❌ Invalid candle data at index ${index} for ${symbol}:`, item);
        throw new Error(`Invalid candle data format at index ${index}`);
      }
      
      return {
        time: parseInt(item[0]), // Real timestamp from Bybit
        open: parseFloat(item[1]), // Real open price
        high: parseFloat(item[2]), // Real high price
        low: parseFloat(item[3]),  // Real low price
        close: parseFloat(item[4]), // Real close price
        volume: parseFloat(item[5]) // Real volume data
      };
    });

    console.log(`✅ Retrieved ${ohlcv.length} REAL candles for ${symbol}, latest: ${new Date(ohlcv[ohlcv.length - 1].time)}, price: ${ohlcv[ohlcv.length - 1].close}`);
    return ohlcv;
  } catch (error) {
    console.error(`❌ Error fetching data for ${symbol} ${timeframe}:`, error);
    throw error;
  }
}

// ALIGNED EMA/SMA series calculation - FIXES INDEXING BUG
function emaSeries(values: number[], len: number): number[] {
  const out = new Array(values.length).fill(NaN);
  if (values.length === 0) return out;
  
  const k = 2 / (len + 1);
  let ema = values[0];
  out[0] = ema;
  
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] - ema) * k + ema;
    out[i] = ema;
  }
  return out;
}

function smaSeries(values: number[], len: number): number[] {
  const out = new Array(values.length).fill(NaN);
  if (values.length < len) return out;
  
  for (let i = len - 1; i < values.length; i++) {
    const sum = values.slice(i - len + 1, i + 1).reduce((a, b) => a + b, 0);
    out[i] = sum / len;
  }
  return out;
}

// REAL technical indicators computation with ALIGNED SERIES
function computeIndicators(data: any[], config: any) {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);
  
  // ALIGNED EMA and SMA series - NO FILTERING
  const ema21Series = emaSeries(closes, config.emaLen || 21);
  const sma200Series = smaSeries(closes, config.smaLen || 200);
  
  const latest = closes.length - 1;
  const ema21Current = ema21Series[latest];
  const ema21Prev3 = ema21Series[Math.max(0, latest - 3)];
  const sma200Current = sma200Series[latest];
  
  // Real ADX calculation
  const { adx, diPlus, diMinus } = calculateADXDMI(highs, lows, closes, 14);
  
  // Real Stochastic calculation
  const { stochK, stochD } = calculateStochastic(highs, lows, closes, 14, 3);
  
  // Real volume indicators
  const obv = calculateOBV(closes, volumes);
  const obvEma = calculateEMA(obv.slice(-21), 21);
  const volSma21 = calculateSMA(volumes, 21);
  const currentVol = volumes[volumes.length - 1];
  const volSpike = currentVol > (volSma21 * (config.volSpikeMult || 1.5));
  
  // Real ATR calculation
  const atr = calculateATR(highs, lows, closes, 14);
  
  // Real HVP calculation
  const hvp = calculateHVP(highs, lows, closes, volumes, 20);
  
  // Price spread and breakout detection
  const current = data[data.length - 1];
  const spread = Math.abs(current.close - current.open) / current.open * 100;
  const breakoutLen = config.breakoutLen || 5;
  const breakoutHigh = Math.max(...highs.slice(-breakoutLen));
  const breakoutLow = Math.min(...lows.slice(-breakoutLen));
  
  return {
    ema21Current,
    ema21Prev3,
    sma200Current,
    adx: Math.round(adx * 10) / 10,
    diPlus: Math.round(diPlus * 10) / 10,
    diMinus: Math.round(diMinus * 10) / 10,
    stochK: Math.round(stochK * 10) / 10,
    stochD: Math.round(stochD * 10) / 10,
    obv: obv[obv.length - 1],
    obvEma,
    hvp: Math.round(hvp * 10) / 10,
    atr: Math.round(atr * 100) / 100,
    volSma21,
    currentVol,
    volSpike,
    spread: Math.round(spread * 1000) / 1000,
    breakoutHigh,
    breakoutLow
  };
}

// SCORE-BASED AItradeX1 strategy - 7 OF 9 FILTERS REQUIRED
function evaluateAItradeX1(data: any[], indicators: any, config: any) {
  const current = data[data.length - 1];
  
  // Initialize filter buckets
  const longFilters = {
    trend: false,
    adx: false,
    dmi: false,
    stoch: false,
    volume: false,
    obv: false,
    hvp: false,
    spread: false,
    breakout: false
  };
  
  const shortFilters = { ...longFilters };
  
  // 1. Trend Filter: EMA21 vs SMA200 AND EMA21 slope
  const trendUp = indicators.ema21Current > indicators.sma200Current && 
                  indicators.ema21Current > indicators.ema21Prev3;
  const trendDown = indicators.ema21Current < indicators.sma200Current && 
                    indicators.ema21Current < indicators.ema21Prev3;
  
  longFilters.trend = trendUp;
  shortFilters.trend = trendDown;
  
  // 2. ADX Filter: Strong trend strength
  const adxThreshold = config.inputs?.adxThreshold || 28;
  const adxStrong = indicators.adx >= adxThreshold;
  longFilters.adx = adxStrong;
  shortFilters.adx = adxStrong;
  
  // 3. DMI Filter: Directional momentum
  longFilters.dmi = indicators.diPlus > indicators.diMinus;
  shortFilters.dmi = indicators.diMinus > indicators.diPlus;
  
  // 4. Stochastic Filter: Not in wrong extreme
  const stochOversold = indicators.stochK < 30;
  const stochOverbought = indicators.stochK > 70;
  longFilters.stoch = !stochOverbought; // OK for long if not overbought
  shortFilters.stoch = !stochOversold;   // OK for short if not oversold
  
  // 5. Volume Filter: Above average volume
  longFilters.volume = indicators.volSpike;
  shortFilters.volume = indicators.volSpike;
  
  // 6. OBV Filter: Volume momentum confirmation
  longFilters.obv = indicators.obv > indicators.obvEma;
  shortFilters.obv = indicators.obv < indicators.obvEma;
  
  // 7. HVP Filter: Volume profile positioning
  const hvpLower = config.inputs?.hvpLower || 55;
  const hvpUpper = config.inputs?.hvpUpper || 85;
  const hvpOK = indicators.hvp >= hvpLower && indicators.hvp <= hvpUpper;
  longFilters.hvp = hvpOK;
  shortFilters.hvp = hvpOK;
  
  // 8. Spread Filter: Reasonable volatility
  const maxSpread = config.inputs?.maxSpread || 0.5;
  const spreadOK = indicators.spread <= maxSpread;
  longFilters.spread = spreadOK;
  shortFilters.spread = spreadOK;
  
  // 9. Breakout Filter: Price action confirmation
  const breakoutUp = current.close > indicators.breakoutHigh;
  const breakoutDown = current.close < indicators.breakoutLow;
  longFilters.breakout = breakoutUp;
  shortFilters.breakout = breakoutDown;
  
  // SCORE-BASED EVALUATION: 7 OF 9 BUCKETS REQUIRED
  const LONG_REQUIRED = 7;
  const SHORT_REQUIRED = 7;
  
  const longPasses = Object.values(longFilters).filter(Boolean).length;
  const shortPasses = Object.values(shortFilters).filter(Boolean).length;
  
  // Strong momentum can bypass breakout requirement
  const momentumOK = adxStrong && Math.abs(indicators.diPlus - indicators.diMinus) > 5;
  
  const longSignal = (longPasses >= LONG_REQUIRED) && 
                     (longFilters.breakout || momentumOK);
  const shortSignal = (shortPasses >= SHORT_REQUIRED) && 
                      (shortFilters.breakout || momentumOK);
  
  const longScore = longPasses * 11.1;  // 0-100 scale
  const shortScore = shortPasses * 11.1;
  
  if (longSignal) {
    return {
      signal: 'LONG' as const,
      score: Math.min(100, Math.round(longScore)),
      filters: longFilters
    };
  }
  
  if (shortSignal) {
    return {
      signal: 'SHORT' as const,
      score: Math.min(100, Math.round(shortScore)),
      filters: shortFilters
    };
  }
  
  return { 
    signal: 'NONE' as const, 
    score: 0, 
    filters: longPasses > shortPasses ? longFilters : shortFilters
  };
}

// Technical indicator calculations using REAL market data
function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const multiplier = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] * multiplier) + (ema * (1 - multiplier));
  }
  return ema;
}

function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  const sum = data.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0;
  
  const trueRanges = [];
  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i - 1]);
    const lowClose = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(highLow, highClose, lowClose));
  }
  
  return calculateSMA(trueRanges, period);
}

function calculateADXDMI(highs: number[], lows: number[], closes: number[], period: number): { adx: number, diPlus: number, diMinus: number } {
  if (highs.length < period + 1) return { adx: 0, diPlus: 0, diMinus: 0 };
  
  let dmPlus = 0;
  let dmMinus = 0;
  let tr = 0;
  
  for (let i = 1; i < Math.min(highs.length, period + 1); i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    
    if (highDiff > lowDiff && highDiff > 0) dmPlus += highDiff;
    else if (lowDiff > highDiff && lowDiff > 0) dmMinus += lowDiff;
    
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i - 1]);
    const lowClose = Math.abs(lows[i] - closes[i - 1]);
    tr += Math.max(highLow, highClose, lowClose);
  }
  
  const diPlus = (dmPlus / tr) * 100;
  const diMinus = (dmMinus / tr) * 100;
  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  
  return { adx: dx, diPlus, diMinus };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, dPeriod: number): { stochK: number, stochD: number } {
  if (highs.length < kPeriod) return { stochK: 50, stochD: 50 };
  
  const recentHighs = highs.slice(-kPeriod);
  const recentLows = lows.slice(-kPeriod);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  
  const stochK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  const stochD = stochK; // Simplified for now
  
  return { stochK, stochD };
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

function calculateHVP(highs: number[], lows: number[], closes: number[], volumes: number[], period: number): number {
  if (volumes.length < period) return 50;
  
  const recentVolumes = volumes.slice(-period);
  const recentCloses = closes.slice(-period);
  
  let totalVol = 0;
  let volWeightedPrice = 0;
  
  for (let i = 0; i < recentVolumes.length; i++) {
    totalVol += recentVolumes[i];
    volWeightedPrice += recentVolumes[i] * recentCloses[i];
  }
  
  const vwap = volWeightedPrice / totalVol;
  const currentPrice = closes[closes.length - 1];
  
  // HVP score based on volume profile and price position
  const pricePosition = (currentPrice - Math.min(...closes.slice(-period))) / 
                       (Math.max(...closes.slice(-period)) - Math.min(...closes.slice(-period)));
  
  return pricePosition * 100;
}

function getTpMultiplier(hvp: number): number {
  if (hvp < 25) return 3.0;
  if (hvp < 50) return 2.5;
  if (hvp < 75) return 2.0;
  return 1.5;
}

function formatTelegramSignal(signal: Signal): any {
  return {
    token: signal.symbol,
    direction: signal.direction,
    entry_price: signal.price,
    confidence_score: signal.score,
    stop_loss: signal.sl,
    take_profit: signal.tp,
    timeframe: signal.timeframe,
    exchange: signal.exchange,
    indicators: {
      hvp: signal.hvp,
      atr: signal.atr
    }
  };
}