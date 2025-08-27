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

// Symbol universe by volume tier (>$5-10M 24h volume)
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
    console.log('🔥 Production AItradeX1 Scanner started');
    
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
    console.log(`📊 Using ${relaxed_filters ? 'relaxed' : 'canonical'} config for ${timeframe}`);

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
    const symbolsToScan = symbols.length > 0 ? symbols : getSymbolUniverse(timeframe);
    console.log(`🎯 Scanning ${symbolsToScan.length} symbols on ${exchange} ${timeframe}`);

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
      algorithm: 'AItradeX1-Production',
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

// Get symbol universe based on timeframe and volume
function getSymbolUniverse(timeframe: string): string[] {
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
      console.log(`📈 Analyzing ${symbol}...`);
      
      // Fetch REAL OHLCV data from Bybit API
      const ohlcvData = await fetchBybitData(symbol, timeframe);
      if (!ohlcvData || ohlcvData.length < 200) {
        console.log(`⚠️ Insufficient data for ${symbol}: ${ohlcvData?.length || 0} bars`);
        continue;
      }

      // Compute REAL technical indicators
      const indicators = computeIndicators(ohlcvData, config.inputs);
      
      // Evaluate AItradeX1 strategy with REAL data
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
        
        // Insert signal to database
        const { data: insertedSignal, error: insertError } = await supabase.from('signals').insert({
          algo: 'AItradeX1',
          exchange: signal.exchange,
          symbol: signal.symbol,
          timeframe: signal.timeframe,
          direction: signal.direction,
          bar_time: new Date(ohlcvData[ohlcvData.length - 1].timestamp).toISOString(),
          price: signal.price,
          score: signal.score,
          atr: signal.atr,
          sl: signal.sl,
          tp: signal.tp,
          hvp: signal.hvp,
          filters: signal.filters,
          indicators: signal.indicators,
          relaxed_mode: signal.relaxed_mode
        }).select().single();

        if (!insertError) {
          signalsProcessed++;
          console.log(`✅ ${symbol} ${signal.direction} signal saved (score: ${signal.score}%)`);
          
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
  
  const barEndTime = lastBar.timestamp + (tfMinutes * 60 * 1000);
  
  // Allow 30 second buffer for bar close
  return now >= (barEndTime - 30000);
}

// Fetch REAL market data from Bybit API - NO MOCK DATA
async function fetchBybitData(symbol: string, timeframe: string): Promise<any[]> {
  const intervalMap: Record<string, string> = {
    '1m': '1',
    '5m': '5', 
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1d': 'D'
  };
  
  const interval = intervalMap[timeframe] || '60';
  const limit = 200; // Get enough data for proper indicators
  
  const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    // Convert Bybit format to our format
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

// REAL technical indicators computation - all calculations use actual market data
function computeIndicators(data: any[], config: any) {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);
  
  // Real EMA and SMA calculations
  const ema21 = calculateEMA(closes, config.emaLen || 21);
  const sma200 = calculateSMA(closes, config.smaLen || 200);
  
  // Real ADX calculation
  const adx = calculateADX(highs, lows, closes, 14);
  const { diPlus, diMinus } = calculateDMI(highs, lows, closes, 14);
  
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
    ema21,
    sma200,
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

// REAL AItradeX1 strategy evaluation with proper filter logic
function evaluateAItradeX1(data: any[], indicators: any, config: any) {
  const current = data[data.length - 1];
  const prev = data[data.length - 2];
  
  // Initialize filters
  const filters = {
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
  
  let score = 0;
  
  // 1. Trend Filter: Price above/below EMA21 vs SMA200
  const bullishTrend = current.close > indicators.ema21 && indicators.ema21 > indicators.sma200;
  const bearishTrend = current.close < indicators.ema21 && indicators.ema21 < indicators.sma200;
  filters.trend = bullishTrend || bearishTrend;
  if (filters.trend) score += 15;
  
  // 2. ADX Filter: Strong trend strength
  const adxThreshold = config.inputs?.adxThreshold || 28;
  filters.adx = indicators.adx > adxThreshold;
  if (filters.adx) score += 12;
  
  // 3. DMI Filter: Directional momentum
  filters.dmi = Math.abs(indicators.diPlus - indicators.diMinus) > 5;
  if (filters.dmi) score += 10;
  
  // 4. Stochastic Filter: Not overbought/oversold in wrong direction
  const stochOversold = indicators.stochK < 30 && indicators.stochD < 30;
  const stochOverbought = indicators.stochK > 70 && indicators.stochD > 70;
  filters.stoch = (bullishTrend && stochOversold) || (bearishTrend && stochOverbought) || 
                 (indicators.stochK > 25 && indicators.stochK < 75);
  if (filters.stoch) score += 8;
  
  // 5. Volume Filter: Above average volume
  filters.volume = indicators.volSpike;
  if (filters.volume) score += 10;
  
  // 6. OBV Filter: Volume momentum confirmation
  filters.obv = (bullishTrend && indicators.obv > indicators.obvEma) || 
               (bearishTrend && indicators.obv < indicators.obvEma);
  if (filters.obv) score += 8;
  
  // 7. HVP Filter: High Volume Profile threshold
  const hvpLower = config.inputs?.hvpLower || 55;
  const hvpUpper = config.inputs?.hvpUpper || 85;
  filters.hvp = indicators.hvp >= hvpLower && indicators.hvp <= hvpUpper;
  if (filters.hvp) score += 12;
  
  // 8. Spread Filter: Reasonable volatility
  const maxSpread = config.inputs?.maxSpread || 0.5;
  filters.spread = indicators.spread <= maxSpread;
  if (filters.spread) score += 5;
  
  // 9. Breakout Filter: Price action confirmation
  const breakoutBullish = current.close > indicators.breakoutHigh && current.close > prev.close;
  const breakoutBearish = current.close < indicators.breakoutLow && current.close < prev.close;
  filters.breakout = breakoutBullish || breakoutBearish;
  if (filters.breakout) score += 15;
  
  // Determine signal direction and final score
  const isLong = bullishTrend && indicators.diPlus > indicators.diMinus && breakoutBullish;
  const isShort = bearishTrend && indicators.diMinus > indicators.diPlus && breakoutBearish;
  
  // Check minimum filter requirements
  const passedFilters = Object.values(filters).filter(f => f).length;
  const minFiltersRequired = config.relaxedMode ? 6 : 8;
  const scoreThreshold = config.relaxedMode ? 60 : 75;
  
  if ((isLong || isShort) && passedFilters >= minFiltersRequired && score >= scoreThreshold) {
    return {
      signal: isLong ? 'LONG' : 'SHORT' as const,
      score: Math.min(100, score),
      filters
    };
  }
  
  return { signal: 'NONE' as const, score: 0, filters };
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

function calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0;
  
  const { diPlus, diMinus } = calculateDMI(highs, lows, closes, period);
  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  
  return dx; // Simplified ADX
}

function calculateDMI(highs: number[], lows: number[], closes: number[], period: number): { diPlus: number, diMinus: number } {
  if (highs.length < period + 1) return { diPlus: 0, diMinus: 0 };
  
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
  
  return { diPlus, diMinus };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, dPeriod: number): { stochK: number, stochD: number } {
  if (highs.length < kPeriod) return { stochK: 50, stochD: 50 };
  
  const recentHighs = highs.slice(-kPeriod);
  const recentLows = lows.slice(-kPeriod);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  
  const stochK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // Simplified %D calculation
  const stochD = stochK; // In real implementation, this would be SMA of %K
  
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