import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration for AItradeX1 Confluence Strategy
const DEFAULT_CONFIG = {
  timeframe: "5m",
  universe: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT", "ADAUSDT", "DOTUSDT", "AVAXUSDT", "MATICUSDT"],
  ema: [9, 21, 50],
  sma_long: 200,
  adx_len: 14,
  adx_min: 20,
  stoch: { k: 14, d: 3, smoothK: 3, ob: 80, os: 20 },
  atr_len: 14,
  volume_ma: 21,
  volume_spike_factor: 1.5,
  hv: { n: 30, window: 180, hvp_high: 60, hvp_low: 20 },
  breakout_lookback: 20,
  score_threshold: 60,
  risk_per_trade: 0.0075,
  validate_next_bar: true
};

// Helper functions for technical indicators
function EMA(values: number[], period: number): number[] {
  const alpha = 2 / (period + 1);
  const result: number[] = [];
  result[0] = values[0];
  
  for (let i = 1; i < values.length; i++) {
    result[i] = alpha * values[i] + (1 - alpha) * result[i - 1];
  }
  return result;
}

function SMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result[i] = values[i];
    } else {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result[i] = sum / period;
    }
  }
  return result;
}

function ATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const trueRanges: number[] = [];
  trueRanges[0] = highs[0] - lows[0];
  
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    trueRanges[i] = Math.max(hl, hc, lc);
  }
  
  return SMA(trueRanges, period);
}

function DMI_ADX(highs: number[], lows: number[], closes: number[], period: number = 14) {
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trueRanges: number[] = [];
  
  plusDM[0] = 0;
  minusDM[0] = 0;
  trueRanges[0] = highs[0] - lows[0];
  
  for (let i = 1; i < highs.length; i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    
    plusDM[i] = (highDiff > lowDiff && highDiff > 0) ? highDiff : 0;
    minusDM[i] = (lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0;
    
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    trueRanges[i] = Math.max(hl, hc, lc);
  }
  
  const smoothedPlusDM = SMA(plusDM, period);
  const smoothedMinusDM = SMA(minusDM, period);
  const smoothedTR = SMA(trueRanges, period);
  
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const adx: number[] = [];
  
  for (let i = 0; i < highs.length; i++) {
    plusDI[i] = smoothedTR[i] !== 0 ? (smoothedPlusDM[i] / smoothedTR[i]) * 100 : 0;
    minusDI[i] = smoothedTR[i] !== 0 ? (smoothedMinusDM[i] / smoothedTR[i]) * 100 : 0;
    
    const diSum = plusDI[i] + minusDI[i];
    const dx = diSum !== 0 ? Math.abs(plusDI[i] - minusDI[i]) / diSum * 100 : 0;
    adx[i] = dx;
  }
  
  const smoothedADX = SMA(adx, period);
  
  return { plusDI, minusDI, adx: smoothedADX };
}

function STOCH(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, kSmooth: number = 3) {
  const kPercent: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      kPercent[i] = 50; // Default value
    } else {
      const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      kPercent[i] = isNaN(k) ? 50 : k;
    }
  }
  
  const smoothedK = SMA(kPercent, kSmooth);
  const smoothedD = SMA(smoothedK, kSmooth);
  
  return { k: smoothedK, d: smoothedD };
}

function calculateHVP(closes: number[], n: number = 30, window: number = 180): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns[i] = Math.log(closes[i] / closes[i - 1]);
  }
  
  const hvp: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < n) {
      hvp[i] = 50; // Default
    } else {
      const recentReturns = returns.slice(i - n + 1, i + 1);
      const volatility = Math.sqrt(recentReturns.reduce((sum, r) => sum + r * r, 0) / n) * Math.sqrt(105120); // Annualized
      
      const lookbackStart = Math.max(0, i - window);
      const historicalVols: number[] = [];
      
      for (let j = lookbackStart; j < i; j++) {
        if (j >= n - 1) {
          const histReturns = returns.slice(j - n + 1, j + 1);
          const histVol = Math.sqrt(histReturns.reduce((sum, r) => sum + r * r, 0) / n) * Math.sqrt(105120);
          historicalVols.push(histVol);
        }
      }
      
      if (historicalVols.length === 0) {
        hvp[i] = 50;
      } else {
        const sortedVols = [...historicalVols].sort((a, b) => a - b);
        const rank = sortedVols.filter(v => v <= volatility).length;
        hvp[i] = (rank / sortedVols.length) * 100;
      }
    }
  }
  
  return hvp;
}

function rollingHigh(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result[i] = values[i];
    } else {
      result[i] = Math.max(...values.slice(i - period + 1, i + 1));
    }
  }
  return result;
}

function rollingLow(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result[i] = values[i];
    } else {
      result[i] = Math.min(...values.slice(i - period + 1, i + 1));
    }
  }
  return result;
}

function crossUp(a: number[], b: number[], index: number): boolean {
  return index > 0 && a[index] > b[index] && a[index - 1] <= b[index - 1];
}

function crossDown(a: number[], b: number[], index: number): boolean {
  return index > 0 && a[index] < b[index] && a[index - 1] >= b[index - 1];
}

// Main AItradeX1 signal evaluation function
function evaluateAItradeX1Signal(candles: any[], symbol: string, config = DEFAULT_CONFIG) {
  if (candles.length < 300) return null;
  
  const closes = candles.map(c => parseFloat(c.close));
  const highs = candles.map(c => parseFloat(c.high));
  const lows = candles.map(c => parseFloat(c.low));
  const volumes = candles.map(c => parseFloat(c.volume));
  
  // Calculate indicators
  const ema9 = EMA(closes, config.ema[0]);
  const ema21 = EMA(closes, config.ema[1]);
  const ema50 = EMA(closes, config.ema[2]);
  const sma200 = SMA(closes, config.sma_long);
  
  const { plusDI, minusDI, adx } = DMI_ADX(highs, lows, closes, config.adx_len);
  const { k, d } = STOCH(highs, lows, closes, config.stoch.k, config.stoch.d);
  
  const volMA = SMA(volumes, config.volume_ma);
  const atr = ATR(highs, lows, closes, config.atr_len);
  const hvp = calculateHVP(closes, config.hv.n, config.hv.window);
  
  const breakoutHighs = rollingHigh(closes, config.breakout_lookback);
  const breakoutLows = rollingLow(closes, config.breakout_lookback);
  
  const currentIndex = closes.length - 1;
  const current = {
    close: closes[currentIndex],
    high: highs[currentIndex],
    low: lows[currentIndex],
    volume: volumes[currentIndex],
    ema9: ema9[currentIndex],
    ema21: ema21[currentIndex],
    ema50: ema50[currentIndex],
    sma200: sma200[currentIndex],
    plusDI: plusDI[currentIndex],
    minusDI: minusDI[currentIndex],
    adx: adx[currentIndex],
    k: k[currentIndex],
    d: d[currentIndex],
    volMA: volMA[currentIndex],
    atr: atr[currentIndex],
    hvp: hvp[currentIndex]
  };
  
  const vsf = current.volume / current.volMA;
  
  // Trend conditions
  const trendUp = current.ema9 > current.ema21 && current.ema21 > current.ema50 && 
                  current.close > current.ema21 && current.close > current.sma200;
  const trendDown = current.ema9 < current.ema21 && current.ema21 < current.ema50 && 
                    current.close < current.ema21 && current.close < current.sma200;
  
  const dmiBull = current.plusDI > current.minusDI;
  const dmiBear = current.minusDI > current.plusDI;
  const trendStrong = current.adx >= config.adx_min;
  
  // Trigger conditions
  const breakoutUp = current.close > breakoutHighs[currentIndex - 1] && vsf >= config.volume_spike_factor;
  const breakoutDown = current.close < breakoutLows[currentIndex - 1] && vsf >= config.volume_spike_factor;
  
  const stochBull = crossUp(k, d, currentIndex) && k[currentIndex - 1] < 40;
  const stochBear = crossDown(k, d, currentIndex) && k[currentIndex - 1] > 60;
  
  const hvpHigh = current.hvp >= 40;
  const hvpComp = current.hvp <= 20 && vsf >= (config.volume_spike_factor + 0.3);
  
  // Scoring functions
  function scoreLong(): number {
    if (!(trendUp && dmiBull && trendStrong)) return 0;
    
    let score = 0;
    score += 25; // Trend stack
    score += 10; // Above SMA200
    score += 15; // DMI direction
    
    // ADX strength
    if (current.adx > 35) score += 12;
    else if (current.adx > 25) score += 8;
    else score += 5;
    
    // Trigger quality (max of applicable)
    let triggerScore = 0;
    if (breakoutUp) triggerScore = Math.max(triggerScore, 15);
    if (stochBull) triggerScore = Math.max(triggerScore, 10);
    // Pullback resume check would go here
    score += triggerScore;
    
    // HVP regime
    if (hvpHigh) score += 8;
    else if (hvpComp) score += 6;
    
    return score;
  }
  
  function scoreShort(): number {
    if (!(trendDown && dmiBear && trendStrong)) return 0;
    
    let score = 0;
    score += 25; // Trend stack
    score += 10; // Below SMA200
    score += 15; // DMI direction
    
    // ADX strength
    if (current.adx > 35) score += 12;
    else if (current.adx > 25) score += 8;
    else score += 5;
    
    // Trigger quality
    let triggerScore = 0;
    if (breakoutDown) triggerScore = Math.max(triggerScore, 15);
    if (stochBear) triggerScore = Math.max(triggerScore, 10);
    score += triggerScore;
    
    // HVP regime
    if (hvpHigh) score += 8;
    else if (hvpComp) score += 6;
    
    return score;
  }
  
  const longScore = scoreLong();
  const shortScore = scoreShort();
  const maxScore = Math.max(longScore, shortScore);
  
  if (maxScore < config.score_threshold) return null;
  
  const side = longScore >= shortScore ? "LONG" : "SHORT";
  const entry = current.close;
  
  // Risk calculations
  let sl: number, tp1: number, tp2: number;
  
  if (side === "LONG") {
    sl = Math.min(
      Math.min(...lows.slice(-5)), // swing low
      current.ema50 - 0.5 * current.atr,
      entry - 1.8 * current.atr
    );
    const r = entry - sl;
    tp1 = entry + 1.0 * r;
    tp2 = entry + 2.0 * r;
  } else {
    sl = Math.max(
      Math.max(...highs.slice(-5)), // swing high
      current.ema50 + 0.5 * current.atr,
      entry + 1.8 * current.atr
    );
    const r = sl - entry;
    tp1 = entry - 1.0 * r;
    tp2 = entry - 2.0 * r;
  }
  
  return {
    strategy: "AItradeX1_Confluence",
    symbol,
    side,
    entry: Math.round(entry * 100000) / 100000,
    stop: Math.round(sl * 100000) / 100000,
    tp1: Math.round(tp1 * 100000) / 100000,
    tp2: Math.round(tp2 * 100000) / 100000,
    score: maxScore,
    confidence_score: maxScore,
    signal_strength: maxScore >= 75 ? "STRONG" : maxScore >= 60 ? "MODERATE" : "WEAK",
    risk_level: maxScore >= 75 ? "LOW" : maxScore >= 60 ? "MEDIUM" : "HIGH",
    rationale: {
      trend: {
        "ema9>21>50": side === "LONG" ? trendUp : trendDown,
        "price_vs_200": side === "LONG" ? current.close > current.sma200 : current.close < current.sma200
      },
      dmi: {
        plusDI: Math.round(current.plusDI * 100) / 100,
        minusDI: Math.round(current.minusDI * 100) / 100,
        adx: Math.round(current.adx * 100) / 100
      },
      stoch: {
        k: Math.round(current.k * 100) / 100,
        d: Math.round(current.d * 100) / 100,
        bull_cross: stochBull,
        bear_cross: stochBear
      },
      volume: {
        vsf: Math.round(vsf * 100) / 100,
        spike: vsf >= config.volume_spike_factor
      },
      hvp: {
        hvp: Math.round(current.hvp * 100) / 100,
        regime: hvpHigh ? "HIGH" : hvpComp ? "COMPRESSION" : "NORMAL"
      }
    },
    metadata: {
      timeframe: config.timeframe,
      timestamp: new Date().toISOString(),
      bar_time: candles[candles.length - 1].time,
      atr: Math.round(current.atr * 100000) / 100000
    }
  };
}

// Fetch market data from CoinGecko
async function fetchMarketData() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h,24h,7d'
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching market data:', error);
    return [];
  }
}

// Generate synthetic OHLCV data for demonstration
function generateSyntheticCandles(basePrice: number, symbol: string): any[] {
  const candles = [];
  let currentPrice = basePrice;
  const now = new Date();
  
  for (let i = 299; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
    
    // Add some realistic price movement
    const volatility = 0.002; // 0.2% volatility
    const trend = Math.sin(i / 50) * 0.001; // Slight trending
    const randomWalk = (Math.random() - 0.5) * volatility;
    
    const priceChange = (trend + randomWalk) * currentPrice;
    currentPrice += priceChange;
    
    const high = currentPrice * (1 + Math.random() * 0.01);
    const low = currentPrice * (1 - Math.random() * 0.01);
    const open = currentPrice + (Math.random() - 0.5) * 0.005 * currentPrice;
    const volume = 1000000 + Math.random() * 5000000;
    
    candles.push({
      time: time.toISOString(),
      open: open.toString(),
      high: high.toString(),
      low: low.toString(),
      close: currentPrice.toString(),
      volume: volume.toString()
    });
  }
  
  return candles;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      'https://codhlwjogfjywmjyjbbn.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
    );

    console.log('[AItradeX1-Confluence] Starting scan...');

    // Fetch market data
    const marketData = await fetchMarketData();
    const signals = [];
    
    for (const coin of DEFAULT_CONFIG.universe) {
      try {
        const coinData = marketData.find(c => 
          c.symbol.toUpperCase() === coin.replace('USDT', '').replace('USD', '')
        );
        
        if (!coinData) continue;
        
        // Generate synthetic candles for demonstration
        const candles = generateSyntheticCandles(coinData.current_price, coin);
        
        // Evaluate signal
        const signal = evaluateAItradeX1Signal(candles, coin, DEFAULT_CONFIG);
        
        if (signal) {
          signals.push(signal);
          console.log(`[AItradeX1-Confluence] Signal generated for ${coin}:`, {
            side: signal.side,
            score: signal.score,
            entry: signal.entry
          });
        }
      } catch (error) {
        console.error(`[AItradeX1-Confluence] Error processing ${coin}:`, error.message);
      }
    }

    // Store signals in database
    if (signals.length > 0) {
      for (const signal of signals) {
        const { error: insertError } = await supabase
          .from('signals')
          .insert({
            exchange: 'confluence',
            symbol: signal.symbol,
            timeframe: DEFAULT_CONFIG.timeframe,
            direction: signal.side,
            entry_price: signal.entry,
            stop_loss: signal.stop,
            take_profit: signal.tp1,
            confidence_score: signal.score,
            signal_strength: signal.signal_strength,
            risk_level: signal.risk_level,
            metadata: {
              strategy: signal.strategy,
              tp2: signal.tp2,
              rationale: signal.rationale,
              ...signal.metadata
            },
            generated_at: new Date().toISOString(),
            bar_time: signal.metadata.bar_time
          });

        if (insertError) {
          console.error('[AItradeX1-Confluence] Error inserting signal:', insertError);
        }
      }
    }

    console.log(`[AItradeX1-Confluence] Scan completed. Generated ${signals.length} signals.`);

    return new Response(
      JSON.stringify({
        success: true,
        strategy: "AItradeX1_Confluence",
        signals_generated: signals.length,
        signals: signals,
        config: DEFAULT_CONFIG,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[AItradeX1-Confluence] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        strategy: "AItradeX1_Confluence"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});