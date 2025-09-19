import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BybitSymbol {
  symbol: string
  baseCoin: string
  quoteCoin: string
  status: string
  marginTrading: string
  contractType?: string
}

interface BybitKlineData {
  symbol: string
  category: string
  list: string[][]
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
  
  const rsiArray: number[] = [NaN]
  
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
  const tr: number[] = [NaN]
  
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
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      smoothed[i] = sum / period
    } else {
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

function hvp(closes: number[], period: number, lookback: number): number[] {
  const hvpArray: number[] = []
  
  for (let i = 0; i < closes.length; i++) {
    if (i < Math.max(period, lookback) - 1) {
      hvpArray.push(NaN)
    } else {
      const recentCloses = closes.slice(i - period + 1, i + 1)
      const returns = []
      for (let j = 1; j < recentCloses.length; j++) {
        returns.push(Math.log(recentCloses[j] / recentCloses[j - 1]))
      }
      
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
      const currentVol = Math.sqrt(variance)
      
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
      
      historicalVols.sort((a, b) => a - b)
      const rank = historicalVols.filter(vol => vol <= currentVol).length
      const percentile = (rank / historicalVols.length) * 100
      
      hvpArray.push(percentile)
    }
  }
  
  return hvpArray
}

function evaluateAItradeX1Advanced(bars: OHLCV[]): any {
  if (bars.length < 300) {
    return null
  }

  const closes = bars.map(b => b.close)
  const highs = bars.map(b => b.high)
  const lows = bars.map(b => b.low)
  const volumes = bars.map(b => b.volume)
  
  const emaFast = ema(closes, 21)
  const emaSlow = ema(closes, 200)
  const rsiValues = rsi(closes, 14)
  const { plusDI, minusDI, adx } = dmi(highs, lows, closes, 13)
  const volumeSMA = sma(volumes, 21)
  const hvpValues = hvp(closes, 21, 100)
  
  const lastIdx = bars.length - 1
  
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
  
  if ([currentEmaFast, currentEmaSlow, currentRSI, currentPlusDI, currentMinusDI, 
       currentADX, currentVolumeSMA, currentHVP].some(val => isNaN(val))) {
    return null
  }
  
  // Advanced signal conditions
  const trendBullish = currentEmaFast > currentEmaSlow
  const rsiOversold = currentRSI < 40
  const adxStrong = currentADX > 25
  const dmiPositive = currentPlusDI > currentMinusDI
  const volumeSpike = currentVolume > (currentVolumeSMA * 1.3)
  const hvpExpanding = currentHVP > 60
  
  const buySignal = trendBullish && rsiOversold && adxStrong && dmiPositive && volumeSpike && hvpExpanding
  
  const trendBearish = currentEmaFast < currentEmaSlow
  const rsiOverbought = currentRSI > 60
  const dmiBearish = currentMinusDI > currentPlusDI
  
  const sellSignal = trendBearish || rsiOverbought || dmiBearish
  
  let confidence = 0
  if (trendBullish) confidence++
  if (rsiOversold) confidence++
  if (adxStrong) confidence++
  if (dmiPositive) confidence++
  if (volumeSpike) confidence++
  if (hvpExpanding) confidence++
  
  const confidenceScore = (confidence / 6) * 100
  
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
      hvp: Math.round(currentHVP * 100) / 100
    },
    conditions: {
      trend_bullish: trendBullish,
      rsi_oversold: rsiOversold,
      adx_strong: adxStrong,
      dmi_positive: dmiPositive,
      volume_spike: volumeSpike,
      hvp_expanding: hvpExpanding
    }
  }
}

async function fetchBybitSymbols(): Promise<BybitSymbol[]> {
  try {
    console.log('🔍 Fetching all Bybit trading pairs...')
    
    // Fetch spot trading pairs
    const spotResponse = await fetch('https://api.bybit.com/v5/market/instruments-info?category=spot')
    const spotData = await spotResponse.json()
    
    if (!spotData.result || !spotData.result.list) {
      throw new Error('Invalid response from Bybit API')
    }
    
    // Filter for active USDT pairs only - removing marginTrading filter
    const usdtPairs = spotData.result.list.filter((symbol: BybitSymbol) => 
      symbol.quoteCoin === 'USDT' && 
      symbol.status === 'Trading'
    )
    
    console.log(`📊 Found ${usdtPairs.length} active USDT trading pairs`)
    return usdtPairs
    
  } catch (error) {
    console.error('❌ Error fetching Bybit symbols:', error)
    return []
  }
}

async function fetchKlineData(symbol: string, interval: string = '5', limit: number = 300): Promise<OHLCV[]> {
  try {
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (!data.result || !data.result.list) {
      return []
    }
    
    // Convert Bybit kline data to OHLCV format
    const bars: OHLCV[] = data.result.list.map((item: string[]) => ({
      time: parseInt(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    })).reverse() // Bybit returns newest first, we want oldest first
    
    return bars
    
  } catch (error) {
    console.error(`❌ Error fetching kline data for ${symbol}:`, error)
    return []
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting Bybit Comprehensive Scanner...')
    
    const body = await req.json().catch(() => ({}))
    const batchSize = body.batch_size || 20 // Process in batches to avoid rate limits
    const timeframes = body.timeframes || ['5'] // 5-minute default
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch all available trading pairs
    const allSymbols = await fetchBybitSymbols()
    
    if (allSymbols.length === 0) {
      throw new Error('No trading pairs found')
    }
    
    console.log(`📈 Processing ${allSymbols.length} symbols in batches of ${batchSize}`)
    
    const signals: any[] = []
    let processedCount = 0
    let signalCount = 0
    
    // Process symbols in batches
    for (let i = 0; i < allSymbols.length; i += batchSize) {
      const batch = allSymbols.slice(i, i + batchSize)
      
      console.log(`📊 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allSymbols.length/batchSize)} (${batch.length} symbols)`)
      
      // Process batch symbols in parallel
      const batchPromises = batch.map(async (symbolInfo) => {
        const symbol = symbolInfo.symbol
        
        try {
          for (const timeframe of timeframes) {
            // Fetch market data
            const bars = await fetchKlineData(symbol, timeframe)
            
            if (bars.length < 300) {
              continue // Skip if insufficient data
            }
            
            // Evaluate signal
            const signal = evaluateAItradeX1Advanced(bars)
            
            if (signal) {
              const signalData = {
                ...signal,
                exchange: 'bybit',
                symbol,
                timeframe: `${timeframe}m`,
                created_at: new Date().toISOString()
              }
              
              console.log(`✅ Signal generated: ${signal.signal} ${symbol} (${signal.confidence_score}%)`)
              
              // Store signal in database
              const { error } = await supabase
                .from('signals')
                .upsert({
                  exchange: 'bybit',
                  symbol,
                  timeframe: `${timeframe}m`,
                  direction: signal.signal,
                  bar_time: signal.bar_time,
                  price: signal.price,
                  entry_price: signal.price,
                  score: signal.confidence_score,
                  signal_strength: signal.confidence_score > 70 ? 'STRONG' : signal.confidence_score > 50 ? 'MEDIUM' : 'WEAK',
                  risk_level: 'MEDIUM',
                  metadata: {
                    algorithm: signal.algorithm,
                    indicators: signal.indicators,
                    conditions: signal.conditions
                  },
                  status: 'active',
                  generated_at: new Date().toISOString()
                }, {
                  onConflict: 'exchange,symbol,timeframe,direction,bar_time'
                })
              
              if (!error) {
                signalCount++
                return signalData
              } else {
                console.error(`❌ Error storing signal for ${symbol}:`, error)
              }
            }
          }
          
          processedCount++
          
          if (processedCount % 10 === 0) {
            console.log(`📈 Progress: ${processedCount}/${allSymbols.length} symbols processed, ${signalCount} signals generated`)
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${symbol}:`, error)
        }
        
        return null
      })
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      signals.push(...batchResults.filter(result => result !== null))
      
      // Rate limiting: small delay between batches
      if (i + batchSize < allSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }
    }
    
    console.log(`🎯 Scan complete! Processed ${processedCount} symbols, generated ${signalCount} signals`)
    
    return new Response(
      JSON.stringify({
        success: true,
        total_symbols_scanned: processedCount,
        signals_generated: signalCount,
        symbols_found: allSymbols.length,
        sample_signals: signals.slice(0, 10), // Return first 10 as sample
        timestamp: new Date().toISOString(),
        algorithm: 'AItradeX1-Advanced-Comprehensive'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )

  } catch (error) {
    console.error('❌ Comprehensive scanner error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Comprehensive scanner execution failed', 
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