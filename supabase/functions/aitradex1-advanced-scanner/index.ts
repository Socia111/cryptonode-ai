import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AItradeX1 Advanced Configuration
const CONFIG = {
  ema_fast: 21,
  ema_slow: 200,
  rsi_length: 14,
  rsi_buy_threshold: 40,
  rsi_sell_threshold: 60,
  adx_length: 13,
  adx_threshold: 25,
  dmi_length: 13,
  volume_sma_length: 21,
  volume_spike_multiplier: 1.3,
  hvp_length: 21,
  hvp_lookback: 100,
  hvp_threshold: 60,
  stoch_k_length: 14,
  stoch_d_smooth: 3,
  stoch_oversold: 20,
  stoch_overbought: 80
}

interface OHLCV {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Technical Indicators Implementation
function ema(data: number[], period: number): number[] {
  const multiplier = 2 / (period + 1)
  const emaArray: number[] = []
  
  emaArray[0] = data[0]
  
  for (let i = 1; i < data.length; i++) {
    emaArray[i] = (data[i] * multiplier) + (emaArray[i - 1] * (1 - multiplier))
  }
  
  return emaArray
}

function sma(data: number[], period: number): number[] {
  const smaArray: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      smaArray[i] = NaN
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      smaArray[i] = sum / period
    }
  }
  
  return smaArray
}

function rsi(data: number[], period: number): number[] {
  const gains: number[] = []
  const losses: number[] = []
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  const avgGains = sma(gains, period)
  const avgLosses = sma(losses, period)
  
  const rsiArray: number[] = [NaN] // First value is NaN due to diff
  
  for (let i = 0; i < avgGains.length; i++) {
    if (isNaN(avgGains[i]) || isNaN(avgLosses[i]) || avgLosses[i] === 0) {
      rsiArray.push(NaN)
    } else {
      const rs = avgGains[i] / avgLosses[i]
      const rsiValue = 100 - (100 / (1 + rs))
      rsiArray.push(rsiValue)
    }
  }
  
  return rsiArray
}

function trueRange(highs: number[], lows: number[], closes: number[]): number[] {
  const tr: number[] = [NaN] // First value is NaN
  
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i]
    const hc = Math.abs(highs[i] - closes[i - 1])
    const lc = Math.abs(lows[i] - closes[i - 1])
    tr.push(Math.max(hl, hc, lc))
  }
  
  return tr
}

function wilderSmoothing(data: number[], period: number): number[] {
  const smoothed: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || isNaN(data[i])) {
      smoothed[i] = NaN
    } else if (i === period - 1) {
      // First valid value is SMA
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      smoothed[i] = sum / period
    } else {
      // Wilder's smoothing: (previous * (period - 1) + current) / period
      smoothed[i] = (smoothed[i - 1] * (period - 1) + data[i]) / period
    }
  }
  
  return smoothed
}

function dmi(highs: number[], lows: number[], closes: number[], period: number): { 
  plusDI: number[], 
  minusDI: number[], 
  adx: number[] 
} {
  const tr = trueRange(highs, lows, closes)
  const plusDM: number[] = [NaN]
  const minusDM: number[] = [NaN]
  
  for (let i = 1; i < highs.length; i++) {
    const highMove = highs[i] - highs[i - 1]
    const lowMove = lows[i - 1] - lows[i]
    
    if (highMove > lowMove && highMove > 0) {
      plusDM.push(highMove)
    } else {
      plusDM.push(0)
    }
    
    if (lowMove > highMove && lowMove > 0) {
      minusDM.push(lowMove)
    } else {
      minusDM.push(0)
    }
  }
  
  const smoothedTR = wilderSmoothing(tr, period)
  const smoothedPlusDM = wilderSmoothing(plusDM, period)
  const smoothedMinusDM = wilderSmoothing(minusDM, period)
  
  const plusDI: number[] = []
  const minusDI: number[] = []
  const dx: number[] = []
  
  for (let i = 0; i < smoothedTR.length; i++) {
    if (isNaN(smoothedTR[i]) || smoothedTR[i] === 0) {
      plusDI.push(NaN)
      minusDI.push(NaN)
      dx.push(NaN)
    } else {
      const pdi = 100 * smoothedPlusDM[i] / smoothedTR[i]
      const mdi = 100 * smoothedMinusDM[i] / smoothedTR[i]
      plusDI.push(pdi)
      minusDI.push(mdi)
      
      if (pdi + mdi === 0) {
        dx.push(NaN)
      } else {
        dx.push(100 * Math.abs(pdi - mdi) / (pdi + mdi))
      }
    }
  }
  
  const adx = wilderSmoothing(dx, period)
  
  return { plusDI, minusDI, adx }
}

function stochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, dPeriod: number): {
  k: number[],
  d: number[]
} {
  const k: number[] = []
  
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      k.push(NaN)
    } else {
      const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1))
      const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1))
      
      if (highestHigh === lowestLow) {
        k.push(50) // Avoid division by zero
      } else {
        const kValue = 100 * (closes[i] - lowestLow) / (highestHigh - lowestLow)
        k.push(kValue)
      }
    }
  }
  
  const d = sma(k, dPeriod)
  
  return { k, d }
}

function hvp(closes: number[], period: number, lookback: number): number[] {
  const hvpArray: number[] = []
  
  for (let i = 0; i < closes.length; i++) {
    if (i < Math.max(period, lookback) - 1) {
      hvpArray.push(NaN)
    } else {
      // Calculate current volatility (standard deviation)
      const recentCloses = closes.slice(i - period + 1, i + 1)
      const returns = []
      for (let j = 1; j < recentCloses.length; j++) {
        returns.push(Math.log(recentCloses[j] / recentCloses[j - 1]))
      }
      
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
      const currentVol = Math.sqrt(variance)
      
      // Calculate historical volatilities for percentile ranking
      const historicalVols: number[] = []
      const startIdx = Math.max(period - 1, i - lookback + 1)
      
      for (let k = startIdx; k <= i; k++) {
        const periodCloses = closes.slice(k - period + 1, k + 1)
        const periodReturns = []
        for (let j = 1; j < periodCloses.length; j++) {
          periodReturns.push(Math.log(periodCloses[j] / periodCloses[j - 1]))
        }
        
        const periodMean = periodReturns.reduce((a, b) => a + b, 0) / periodReturns.length
        const periodVariance = periodReturns.reduce((a, b) => a + Math.pow(b - periodMean, 2), 0) / periodReturns.length
        historicalVols.push(Math.sqrt(periodVariance))
      }
      
      // Calculate percentile rank
      historicalVols.sort((a, b) => a - b)
      const rank = historicalVols.filter(vol => vol <= currentVol).length
      const percentile = (rank / historicalVols.length) * 100
      
      hvpArray.push(percentile)
    }
  }
  
  return hvpArray
}

function isCrossover(current: number, previous: number, currentRef: number, previousRef: number): boolean {
  return previous <= previousRef && current > currentRef
}

function isCrossunder(current: number, previous: number, currentRef: number, previousRef: number): boolean {
  return previous >= previousRef && current < currentRef
}

function evaluateAItradeX1Advanced(bars: OHLCV[]): any {
  if (bars.length < Math.max(CONFIG.ema_slow, CONFIG.hvp_lookback) + 10) {
    return null
  }

  const closes = bars.map(b => b.close)
  const highs = bars.map(b => b.high)
  const lows = bars.map(b => b.low)
  const volumes = bars.map(b => b.volume)
  
  // Calculate indicators
  const emaFast = ema(closes, CONFIG.ema_fast)
  const emaSlow = ema(closes, CONFIG.ema_slow)
  const rsiValues = rsi(closes, CONFIG.rsi_length)
  const { plusDI, minusDI, adx } = dmi(highs, lows, closes, CONFIG.dmi_length)
  const volumeSMA = sma(volumes, CONFIG.volume_sma_length)
  const hvpValues = hvp(closes, CONFIG.hvp_length, CONFIG.hvp_lookback)
  const { k: stochK, d: stochD } = stochastic(highs, lows, closes, CONFIG.stoch_k_length, CONFIG.stoch_d_smooth)
  
  const lastIdx = bars.length - 1
  const prevIdx = lastIdx - 1
  
  if (lastIdx < 1) return null
  
  // Current values
  const currentBar = bars[lastIdx]
  const currentEmaFast = emaFast[lastIdx]
  const currentEmaSlow = emaSlow[lastIdx]
  const currentRSI = rsiValues[lastIdx]
  const currentPlusDI = plusDI[lastIdx]
  const currentMinusDI = minusDI[lastIdx]
  const currentADX = adx[lastIdx]
  const currentVolume = volumes[lastIdx]
  const currentVolumeSMA = volumeSMA[lastIdx]
  const currentHVP = hvpValues[lastIdx]
  const currentStochK = stochK[lastIdx]
  const currentStochD = stochD[lastIdx]
  
  // Previous values for crossover detection
  const prevStochK = stochK[prevIdx]
  const prevStochD = stochD[prevIdx]
  
  // Check for NaN values
  if ([currentEmaFast, currentEmaSlow, currentRSI, currentPlusDI, currentMinusDI, 
       currentADX, currentVolumeSMA, currentHVP, currentStochK, currentStochD].some(val => isNaN(val))) {
    return null
  }
  
  // Buy Signal Conditions
  const trendBullish = currentEmaFast > currentEmaSlow
  const rsiOversold = currentRSI < CONFIG.rsi_buy_threshold
  const adxStrong = currentADX > CONFIG.adx_threshold
  const dmiPositive = currentPlusDI > currentMinusDI
  const volumeSpike = currentVolume > (currentVolumeSMA * CONFIG.volume_spike_multiplier)
  const hvpExpanding = currentHVP > CONFIG.hvp_threshold
  const stochOversoldCross = currentStochK < CONFIG.stoch_oversold && isCrossover(currentStochK, prevStochK, currentStochD, prevStochD)
  
  const buySignal = trendBullish && rsiOversold && adxStrong && dmiPositive && volumeSpike && hvpExpanding && stochOversoldCross
  
  // Sell Signal Conditions
  const trendBearish = currentEmaFast < currentEmaSlow
  const rsiOverbought = currentRSI > CONFIG.rsi_sell_threshold
  const dmiBearish = currentMinusDI > currentPlusDI
  const stochOverboughtCross = currentStochK > CONFIG.stoch_overbought && isCrossunder(currentStochK, prevStochK, currentStochD, prevStochD)
  
  const sellSignal = trendBearish || rsiOverbought || dmiBearish || stochOverboughtCross
  
  // Calculate confidence score (0-7 based on conditions met)
  let confidence = 0
  if (trendBullish) confidence++
  if (rsiOversold) confidence++
  if (adxStrong) confidence++
  if (dmiPositive) confidence++
  if (volumeSpike) confidence++
  if (hvpExpanding) confidence++
  if (stochOversoldCross) confidence++
  
  const confidenceScore = (confidence / 7) * 100
  
  if (!buySignal && !sellSignal) return null
  
  return {
    algorithm: 'AItradeX1-Advanced',
    signal: buySignal ? 'BUY' : 'SELL',
    price: currentBar.close,
    confidence_score: Math.round(confidenceScore),
    bar_time: new Date(currentBar.time).toISOString(),
    indicators: {
      ema_fast: Math.round(currentEmaFast * 100) / 100,
      ema_slow: Math.round(currentEmaSlow * 100) / 100,
      rsi: Math.round(currentRSI * 100) / 100,
      adx: Math.round(currentADX * 100) / 100,
      plus_di: Math.round(currentPlusDI * 100) / 100,
      minus_di: Math.round(currentMinusDI * 100) / 100,
      volume_ratio: Math.round((currentVolume / currentVolumeSMA) * 100) / 100,
      hvp: Math.round(currentHVP * 100) / 100,
      stoch_k: Math.round(currentStochK * 100) / 100,
      stoch_d: Math.round(currentStochD * 100) / 100
    },
    conditions: {
      trend_bullish: trendBullish,
      rsi_oversold: rsiOversold,
      adx_strong: adxStrong,
      dmi_positive: dmiPositive,
      volume_spike: volumeSpike,
      hvp_expanding: hvpExpanding,
      stoch_oversold_cross: stochOversoldCross
    },
    metadata: {
      timeframe: '5m',
      strategy_version: '1.0',
      relaxed_mode: false
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 AItradeX1 Advanced Scanner starting...')
    
    // Get request body
    const body = await req.json().catch(() => ({}))
    const symbols = body.symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT']
    const timeframes = body.timeframes || ['5m']
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const signals: any[] = []
    
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          console.log(`📊 Processing ${symbol} ${timeframe}...`)
          
          // Fetch market data (mock data for demo)
          const bars: OHLCV[] = []
          const basePrice = 50000 + Math.random() * 20000
          const currentTime = Date.now()
          
          for (let i = 299; i >= 0; i--) {
            const time = currentTime - (i * 5 * 60 * 1000) // 5 minute intervals
            const price = basePrice + (Math.random() - 0.5) * 5000
            const volume = 1000000 + Math.random() * 2000000
            
            bars.push({
              time,
              open: price,
              high: price * (1 + Math.random() * 0.02),
              low: price * (1 - Math.random() * 0.02),
              close: price + (Math.random() - 0.5) * 100,
              volume
            })
          }
          
          // Evaluate signal
          const signal = evaluateAItradeX1Advanced(bars)
          
          if (signal) {
            const signalData = {
              ...signal,
              exchange: 'bybit',
              symbol,
              timeframe,
              created_at: new Date().toISOString()
            }
            
            console.log(`✅ Generated ${signal.signal} signal for ${symbol} with confidence ${signal.confidence_score}%`)
            signals.push(signalData)
            
            // Store signal in database
            const { error } = await supabase
              .from('signals')
              .upsert({
                exchange: 'bybit',
                symbol,
                timeframe,
                direction: signal.signal,
                bar_time: signal.bar_time,
                entry_price: signal.price,
                confidence_score: signal.confidence_score,
                signal_strength: signal.confidence_score > 70 ? 'STRONG' : signal.confidence_score > 50 ? 'MEDIUM' : 'WEAK',
                risk_level: 'MEDIUM',
                metadata: {
                  algorithm: signal.algorithm,
                  indicators: signal.indicators,
                  conditions: signal.conditions,
                  strategy_metadata: signal.metadata
                },
                status: 'active',
                generated_at: new Date().toISOString()
              }, {
                onConflict: 'exchange,symbol,timeframe,direction,bar_time'
              })
            
            if (error) {
              console.error(`❌ Error storing signal for ${symbol}:`, error)
            }
          } else {
            console.log(`⏸️ No signal generated for ${symbol} ${timeframe}`)
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${symbol} ${timeframe}:`, error)
        }
      }
    }
    
    console.log(`🎯 Generated ${signals.length} total signals`)
    
    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: signals.length,
        signals: signals,
        timestamp: new Date().toISOString(),
        algorithm: 'AItradeX1-Advanced'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )

  } catch (error) {
    console.error('❌ Scanner error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Scanner execution failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  }
})